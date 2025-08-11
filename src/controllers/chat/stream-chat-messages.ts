import { Response } from 'express';
import { z } from 'zod';

import { switch_models } from '../../utils/switch-models';
import { message_handling_service } from '../../services/message-handling-service';
import { document_search_service } from '../../services/document-search-service';
import { streaming_service } from '../../services/streaming-service';
import { tool_status_service } from '../../services/tool-status-service';
import { TConversation } from '../../types/conversation';
import { TModelType, modelTypes } from '../../types/shared';
import { throw_error } from '../../utils/throw-error';
import { mg } from '../../config/mg';

import { TAuthenticatedRequest } from '../../types/shared';

export const stream_chat_messages = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const { id } = z_stream_chat_messages_req_params.parse(req.params);

    const firebase_user = req.user;

    const db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid }).lean();
    if (!db_user) {
        throw_error({ message: 'User not found', status_code: 404 });
        return;
    }

    const parsed_body = z_stream_chat_messages_req_body.parse(req.body);
    const message: string = parsed_body.message;
    const user_id: string = db_user._id.toString();
    const model: TModelType = parsed_body.model;
    const selected_file_ids: string[] | undefined = parsed_body.selected_file_ids;

    const abort_controller = new AbortController();
    const selected_model = switch_models({ model });
    const intelligent_search_enabled = process.env.INTELLIGENT_SEARCH !== 'false';

    // Setup tool status handling
    const tool_status_handler = tool_status_service.setup_tool_status_handler(res);

    // Setup cleanup on client disconnect
    res.on('close', async () => {
        console.log('Client disconnected, aborting stream');
        tool_status_service.cleanup_tool_status_handler(tool_status_handler);
        abort_controller.abort();
    });

    try {
        // Get or create conversation and save user message
        const conversation: TConversation = await message_handling_service.get_or_create_conversation({ conversation_id: id, message, user_id });

        await message_handling_service.save_user_message({ message, conversation_id: conversation._id, user_id });

        // Setup streaming headers
        streaming_service.setup_streaming_headers(res);

        // Search for relevant documents
        const relevant_context = await document_search_service.search_relevant_documents({
            query: message,
            file_ids: selected_file_ids,
            intelligent_search_enabled
        });

        console.log("Starting stream with model:", model);
        console.log("User message for RAG search:", message);

        // Handle streaming
        const ai_response = await streaming_service.handle_streaming({
            model: selected_model,
            conversation,
            relevant_context,
            selected_file_ids,
            abort_controller,
            res
        });

        // Send completion signal
        if (!abort_controller.signal.aborted) {
            res.write('data: [DONE]\n\n');
        }
        res.end();

        console.log("Stream completed. AI response length:", ai_response.length);

        // Save AI response
        await message_handling_service.save_ai_message({
            ai_response,
            conversation_id: conversation._id,
            user_id
        });

    } catch (stream_error: unknown) {
        // Handle AbortError specifically
        const is_abort_error = stream_error instanceof Error && stream_error.name === 'AbortError';
        if (is_abort_error || abort_controller.signal.aborted) {
            console.log('Stream was cancelled by client - this is normal behavior');
            if (!res.headersSent) {
                res.status(200).end();
            } else {
                res.end();
            }
            return;
        }

        // Handle actual errors
        console.error('Unexpected error in chat stream:', stream_error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.write('data: [ERROR]\n\n');
            res.end();
        }
    } finally {
        tool_status_service.cleanup_tool_status_handler(tool_status_handler);
    }
};

const z_stream_chat_messages_req_params = z.object({
    id: z.string().min(1, 'id is required'),
});

const z_stream_chat_messages_req_body = z.object({
    message: z.string().min(1, 'message is required'),
    user_id: z.string().min(1, 'user_id is required'),
    model: z.enum(modelTypes, {
        errorMap: () => ({ message: 'model must be one of: openai, mistral, gemini' })
    }),
    selected_file_ids: z.array(z.string()).optional(),
});
