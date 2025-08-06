import { Response } from 'express';
import { LanguageModel, Message, streamText } from 'ai';
import { TConversation } from '../types/conversation';
import { TStreamChatChunk } from '../types/shared';
import { qr_code_tool } from '../tools/qr-code-tool';
import { web_search_tool } from '../tools/web-search-tool';
import { weather_tool } from '../tools/weather-tool';
import { hybrid_memory_manager } from '../lib/hybrid-memory-manager';
import { generate_system_prompt } from '../lib/system-prompts';

// SSE headers for chat streaming
const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
} as const;

export type TStreamingParams = {
    model: LanguageModel;
    conversation: TConversation;
    relevant_context: string;
    selected_file_ids?: string[];
    abort_controller: AbortController;
    res: Response;
};

export const streaming_service = {
    async handle_streaming({
        model,
        conversation,
        relevant_context,
        selected_file_ids,
        abort_controller,
        res
    }: TStreamingParams): Promise<string> {
        if (!conversation || !conversation._id) {
            throw new Error('Conversation not properly initialized');
        }

        const { summary, messages_to_send } = await hybrid_memory_manager({
            conversation_id: conversation._id
        });

        const { system_content } = generate_system_prompt({
            conversation_id: conversation._id.toString(),
            relevant_context,
            selected_file_ids,
            include_qr_tools: true,
            include_web_search_tools: true,
            include_weather_tools: true,
            summary
        });

        if (!relevant_context.trim()) {
            console.log('💬 No document context found - proceeding with general knowledge only');
        }

        const system_message: Message = {
            id: 'system-message',
            role: 'system',
            content: system_content
        };

        const result = streamText({
            model,
            messages: [system_message, ...messages_to_send],
            abortSignal: abort_controller.signal,
            tools: {
                qr_code_tool,
                web_search_tool,
                weather_tool,
            },
            toolChoice: 'auto',
            maxSteps: 10,
        });

        let ai_response = '';

        for await (const text_part of result.textStream) {
            if (abort_controller.signal.aborted) {
                console.log('Stream aborted by client - stopping iteration');
                break;
            }
            ai_response += text_part;

            const stream_chunk: TStreamChatChunk = {
                content: text_part,
                conversation_id: conversation._id.toString()
            };

            res.write(`data: ${JSON.stringify(stream_chunk)}\n\n`);
        }

        return ai_response;
    },

    setup_streaming_headers(res: Response): void {
        res.writeHead(200, {
            'Content-Type': SSE_HEADERS['Content-Type'],
            'Cache-Control': SSE_HEADERS['Cache-Control'],
            'Connection': SSE_HEADERS['Connection'],
        });
    }
}; 