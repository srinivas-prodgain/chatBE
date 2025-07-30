import { Request, Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';
import { TConversation } from '../../types/conversation';
import { TStreamChatRequest, TStreamChatChunk, TToolStatus } from '../../types/shared';
import { switch_models } from '../../utils/switch-models';
import { LanguageModel, Message, streamText } from 'ai';
import { qr_code_tool } from '../../tools/qr-code-tool';
import { time_tool } from '../../tools/time-tool';
import { web_search_tool } from '../../tools/web-search-tool';
import { documentEmbeddingsMongoDBService } from '../../services/document-embeddings-mongodb-service';
import { analyzeQuery } from '../../lib/query-analyzer';
import { hybrid_memory_manager } from '../../lib/hybrid-memory-manager';
import { generate_system_prompt } from '../../lib/system-prompts';
import { Types } from 'mongoose';
import { MAX_CONTEXT_CHUNKS } from '../../constants/document-processing';
import { SSE_HEADERS, CONVERSATION_TITLE_MAX_LENGTH } from '../../constants/file-upload';
import { toolEventEmitter } from '../../utils/event-emitter';

export const stream_chat_messages = async ({ req, res }: { req: Request, res: Response }) => {
    const { uid } = z_stream_chat_messages_req_params.parse(req.params);
    const { message, userId, model, selectedFileIds }: TStreamChatRequest = z_stream_chat_messages_req_body.parse(req.body);

    const abortController = new AbortController();
    let aiResponse = '';
    let conversation: TConversation | null = null;

    const selectedModel = switch_models(model);

    // Use the latest user message for document search
    const latestUserMessage = message;

    const handle_save_message = async ({ aiResponse }: { aiResponse: string }): Promise<void> => {
        if (!conversation) {
            throw_error({ message: 'Conversation not found', status_code: 404 });
            return;
        }
        const aiMessage = new mg.ChatMessage({
            message: aiResponse,
            sender: 'ai',
            conversationId: conversation._id
        });
        await aiMessage.save();
        await mg.Conversation.findByIdAndUpdate(conversation._id, { updatedAt: new Date() });
    };

    const search_relevant_documents = async ({ query, fileIds }: { query: string, fileIds?: string[] }): Promise<string> => {
        try {
            if (fileIds && fileIds.length > 0) {
                console.log(`🎯 Searching in ${fileIds.length} selected files with query:`, query.substring(0, 100) + '...');
                console.log('📂 Selected file IDs:', fileIds);
            } else {
                console.log('🔍 Searching for relevant documents with query:', query.substring(0, 100) + '...');
            }

            // Search for similar documents - either in specific files or globally
            const searchResults = fileIds && fileIds.length > 0
                ? await documentEmbeddingsMongoDBService.searchInMultipleFiles({ fileIds, query, maxResults: 5 })
                : await documentEmbeddingsMongoDBService.searchSimilarDocuments({ query, maxResults: 5 });

            if (!searchResults || searchResults.length === 0) {
                console.log('📄 No relevant documents found - continuing without context');
                return '';
            }

            console.log(`📚 Found ${searchResults.length} relevant document chunks`);

            // Flatten the results and join them as context
            const contextChunks = searchResults.flat();

            // Filter out empty chunks and limit total context length
            const filteredChunks = contextChunks
                .filter((chunk: string) => chunk && chunk.trim().length > 0)
                .slice(0, MAX_CONTEXT_CHUNKS); // Limit to top 5 chunks to avoid token limits

            if (filteredChunks.length === 0) {
                console.log('📄 No valid document chunks found after filtering');
                return '';
            }

            const contextText = filteredChunks.join('\n\n---\n\n');

            console.log(`✅ Using ${filteredChunks.length} document chunks as context (${contextText.length} characters)`);

            return contextText;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('❌ Error searching documents:', errorMessage);
            return ''; // Continue without context if search fails
        }
    };


    // Tool status handling

    const sendToolStatus = (status: { tool: string; status: 'started' | 'completed'; details?: any }) => {
        const statusChunk = {
            type: 'tool_status',
            ...status
        };
        // console.log('🔧 Tool status:', statusChunk);
        res.write(`data: ${JSON.stringify(statusChunk)}\n\n`);
    };
    const handleToolStatus = (status: TToolStatus) => {
        sendToolStatus(status);
    };
    toolEventEmitter.on('toolStatus', handleToolStatus);


    res.on('close', async () => {
        console.log('Client disconnected, aborting stream');
        toolEventEmitter.off('toolStatus', handleToolStatus);
        abortController.abort();
        if (aiResponse.trim()) {
            console.log("Saving AI response to database");
            await handle_save_message({ aiResponse });
        }
    });

    conversation = await mg.Conversation.findOne({ uid });
    if (!conversation) {
        // Create new conversation with first message as title
        const title = message.substring(0, CONVERSATION_TITLE_MAX_LENGTH) || 'New Chat';
        conversation = new mg.Conversation({
            uid,
            title,
            userId
        });
        await conversation?.save();
    }

    // Save user message
    const userMessage = new mg.ChatMessage({
        message: message,
        sender: 'user',
        conversationId: conversation._id
    });
    await userMessage.save();

    // Set headers for streaming
    res.writeHead(200, {
        'Content-Type': SSE_HEADERS['Content-Type'],
        'Cache-Control': SSE_HEADERS['Cache-Control'],
        'Connection': SSE_HEADERS['Connection'],
    });


    const handle_streaming = async ({ model }: { model: LanguageModel }): Promise<void> => {

        // Check if intelligent search is enabled (default: true)
        const intelligentSearchEnabled = process.env.INTELLIGENT_SEARCH !== 'false';

        let relevantContext = '';

        if (intelligentSearchEnabled) {
            // Analyze if the query needs document search
            console.log('🤔 Analyzing query for document search necessity...');
            const queryAnalysis = await analyzeQuery(latestUserMessage);
            console.log(`📊 Analysis result: ${queryAnalysis.needsSearch ? 'SEARCH NEEDED' : 'NO SEARCH'} - ${queryAnalysis.reason} (confidence: ${queryAnalysis.confidence})`);

            // Conditionally search for relevant documents
            if (queryAnalysis.needsSearch) {
                // Use optimized query if available, otherwise fall back to original
                const searchQuery = queryAnalysis.optimizedQuery || latestUserMessage;
                if (queryAnalysis.optimizedQuery) {
                    console.log(`🔍 Using optimized search query: "${queryAnalysis.optimizedQuery}"`);
                }
                // Pass selectedFiles to limit search scope if specified
                relevantContext = await search_relevant_documents({ query: searchQuery, fileIds: selectedFileIds });
            } else {
                console.log('💬 Skipping document search - responding conversationally');
            }
        } else {
            // Fallback: always search (original behavior)
            console.log('🔍 Intelligent search disabled - using traditional search');
            relevantContext = await search_relevant_documents({ query: latestUserMessage, fileIds: selectedFileIds });
        }

        // Ensure conversation exists before calling hybrid_memory_manager
        if (!conversation || !conversation._id) {
            throw_error({ message: 'Conversation not properly initialized', status_code: 500 });
            return;
        }

        const { summary, messagesToSend } = await hybrid_memory_manager({ conversationId: conversation._id as Types.ObjectId });


        // Generate system prompt using the new system prompts function
        const { system_content: systemContent } = generate_system_prompt({
            conversation_id: conversation?._id?.toString() || '',
            relevant_context: relevantContext,
            selected_file_ids: selectedFileIds,
            include_qr_tools: true,
            include_web_search_tools: true,
            include_time_tools: true,
            summary: summary
        });

        if (!relevantContext.trim()) {
            console.log('💬 No document context found - proceeding with general knowledge only');
        }

        const systemMessage: Message = {
            id: 'system-message',
            role: 'system',
            content: systemContent
        };
        // console.log('🔍 System message:', systemMessage);




        const result = streamText({
            model: model,
            messages: [systemMessage, ...messagesToSend],
            abortSignal: abortController.signal,
            tools: {
                qr_code_tool,
                time_tool,
                web_search_tool,
            },
            toolChoice: 'auto',
            maxSteps: 10,
        });

        for await (const textPart of result.textStream) {
            if (abortController.signal.aborted) {
                console.log('Stream aborted by client - stopping iteration');
                break;
            }
            aiResponse += textPart;

            // Use typed stream chunk
            const streamChunk: TStreamChatChunk = {
                content: textPart,
                conversationId: conversation?._id?.toString() || ''
            };

            res.write(`data: ${JSON.stringify(streamChunk)}\n\n`);
        }
    };

    try {
        console.log("Starting stream with model:", model);
        console.log("User message for RAG search:", latestUserMessage);

        await handle_streaming({ model: selectedModel });

        // Only send [DONE] if not aborted
        if (!abortController.signal.aborted) {
            res.write('data: [DONE]\n\n');
        }
        res.end();

        console.log("Stream completed. AI response length:", aiResponse.length);
    } catch (streamError: unknown) {
        // Handle AbortError specifically - this is expected behavior when client cancels
        const isAbortError = streamError instanceof Error && streamError.name === 'AbortError';
        if (isAbortError || abortController.signal.aborted) {
            console.log('Stream was cancelled by client - this is normal behavior');
            if (!res.headersSent) {
                res.status(200).end(); // 200 because cancellation is not an error
            } else {
                res.end();
            }
            return;
        }

        // Handle actual errors
        console.error('Unexpected error in chat stream:', streamError);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.write('data: [ERROR]\n\n');
            res.end();
        }
    }
};

const z_stream_chat_messages_req_params = z.object({
    uid: z.string().min(1, 'uid is required'),
});

const z_stream_chat_messages_req_body = z.object({
    message: z.string().min(1, 'message is required'),
    userId: z.string().min(1, 'userId is required'),
    model: z.string().min(1, 'model is required'),
    selectedFileIds: z.array(z.string()).optional(),
});
