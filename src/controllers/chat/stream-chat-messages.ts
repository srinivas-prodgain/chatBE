import { Request, Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';
import { TConversation } from '../../types/conversation';
import { TStreamChatRequest, TStreamChatChunk } from '../../types/shared';
import { switch_models } from '../../utils/switch-models';
import { LanguageModel, Message, streamText } from 'ai';
import { qr_code_tool } from '../../lib/tools/qr-code-tool';
import { documentEmbeddingsMongoDBService } from '../../lib/document-embeddings-mongodb-service';
import { analyzeQuery } from '../../lib/query-analyzer';

export const stream_chat_messages = async (req: Request, res: Response) => {
    const { uid } = z_stream_chat_messages_req_params.parse(req.params);
    const { message, userId, model, selectedFileIds }: TStreamChatRequest = z_stream_chat_messages_req_body.parse(req.body);

    const abortController = new AbortController();
    let aiResponse = '';
    let conversation: TConversation | null = null;

    const selectedModel = switch_models(model);

    // Use the latest user message for document search
    const latestUserMessage = message;

    async function handleSaveMessage(aiResponse: string) {
        if (!conversation) {
            throw_error('Conversation not found', 404);
        }
        const aiMessage = new mg.ChatMessage({
            message: aiResponse,
            sender: 'ai',
            conversationId: conversation?._id
        });
        await aiMessage.save();
        await mg.Conversation.findByIdAndUpdate(conversation?._id, { updatedAt: new Date() });
    }

    async function getConversationMessages(conversationId: string): Promise<Message[]> {
        try {
            console.log('📨 Fetching conversation messages from database...');

            const chatMessages = await mg.ChatMessage
                .find({ conversationId })
                .sort({ createdAt: 1 }) // Sort by creation time, oldest first
                .lean();

            console.log(`📬 Retrieved ${chatMessages.length} messages from conversation`);

            const messages: Message[] = chatMessages.map((msg, index) => ({
                id: msg._id?.toString() || `msg-${index}`,
                role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: msg.message
            }));

            return messages;
        } catch (error: any) {
            console.error('❌ Error fetching conversation messages:', error.message);
            return [];
        }
    }

    async function searchRelevantDocuments(query: string, fileIds?: string[]): Promise<string> {
        try {
            if (fileIds && fileIds.length > 0) {
                console.log(`🎯 Searching in ${fileIds.length} selected files with query:`, query.substring(0, 100) + '...');
                console.log('📂 Selected file IDs:', fileIds);
            } else {
                console.log('🔍 Searching for relevant documents with query:', query.substring(0, 100) + '...');
            }

            // Search for similar documents - either in specific files or globally
            const searchResults = fileIds && fileIds.length > 0
                ? await documentEmbeddingsMongoDBService.searchInMultipleFiles(fileIds, query, 5)
                : await documentEmbeddingsMongoDBService.searchSimilarDocuments(query, 5);

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
                .slice(0, 5); // Limit to top 5 chunks to avoid token limits

            if (filteredChunks.length === 0) {
                console.log('📄 No valid document chunks found after filtering');
                return '';
            }

            const contextText = filteredChunks.join('\n\n---\n\n');

            console.log(`✅ Using ${filteredChunks.length} document chunks as context (${contextText.length} characters)`);

            return contextText;
        } catch (error: any) {
            console.error('❌ Error searching documents:', error.message);
            return ''; // Continue without context if search fails
        }
    }

    res.on('close', async () => {
        console.log('Client disconnected, aborting stream');
        abortController.abort();
        if (aiResponse.trim()) {
            console.log("Saving AI response to database");
            await handleSaveMessage(aiResponse);
        }
    });

    conversation = await mg.Conversation.findOne({ uid });
    if (!conversation) {
        // Create new conversation with first message as title
        const title = message.substring(0, 50) || 'New Chat';
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
        conversationId: conversation?._id
    });
    await userMessage.save();

    // Set headers for streaming
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });


    async function handleStreaming(model: LanguageModel) {

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
                relevantContext = await searchRelevantDocuments(searchQuery, selectedFileIds);
            } else {
                console.log('💬 Skipping document search - responding conversationally');
            }
        } else {
            // Fallback: always search (original behavior)
            console.log('🔍 Intelligent search disabled - using traditional search');
            relevantContext = await searchRelevantDocuments(latestUserMessage, selectedFileIds);
        }

        let systemContent = `You are a helpful AI assistant with access to tools. You can:
          
          **Generate QR codes** using generateQRCode tool to create QR codes for any data
          
          Use generateQRCode when users ask about:
          - Creating QR codes for websites, URLs, text, contact info, etc.
          - "Generate QR code for..." or "Create QR code for..."
          - Converting text/URLs to QR codes
          - QR code generation in different formats (PNG, SVG, data URL)
          
          Current conversation ID: ${conversation?._id}`;

        // Add document context if found
        if (relevantContext.trim()) {
            const contextSource = selectedFileIds && selectedFileIds.length > 0
                ? `from ${selectedFileIds.length} selected file(s)`
                : 'from uploaded documents';

            systemContent += `\n\n**📚 DOCUMENT CONTEXT AVAILABLE:**

I have access to relevant information ${contextSource} that may help answer your question. Here is the context:

---DOCUMENT CONTEXT START---
${relevantContext}
---DOCUMENT CONTEXT END---

**Instructions for using this context:**
- Use this information to provide accurate, detailed responses
- When referencing information from the documents, you can mention "Based on the uploaded documents..." or "According to the provided information..."
- If the user's question is directly answered by the context, prioritize that information
- If the context is not relevant to the user's question, you can ignore it and respond normally
- Combine the document context with your general knowledge when appropriate`;
        } else {
            console.log('💬 No document context found - proceeding with general knowledge only');
        }

        console.log("System content:", systemContent);

        const systemMessage: Message = {
            id: 'system-message',
            role: 'system',
            content: systemContent
        };

        // Fetch conversation history from database
        const conversationMessages = await getConversationMessages(conversation?._id?.toString() || '');

        console.log(`💬 Using ${conversationMessages.length} messages from conversation history`);

        const result = streamText({
            model: model,
            messages: [systemMessage, ...conversationMessages],
            abortSignal: abortController.signal,
            tools: {
                qr_code_tool,
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
    }

    try {
        console.log("Starting stream with model:", model);
        console.log("User message for RAG search:", latestUserMessage);

        await handleStreaming(selectedModel);

        // Only send [DONE] if not aborted
        if (!abortController.signal.aborted) {
            res.write('data: [DONE]\n\n');
        }
        res.end();

        console.log("Stream completed. AI response length:", aiResponse.length);
    } catch (streamError: any) {
        // Handle AbortError specifically - this is expected behavior when client cancels
        if (streamError.name === 'AbortError' || abortController.signal.aborted) {
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
