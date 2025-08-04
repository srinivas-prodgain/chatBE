import { z } from 'zod';
import { tool } from 'ai';

import { ChatMessage } from '../models/chat';




export const mongo_db_tool = tool({
    description: 'Fetch conversation history from MongoDB. Use this when you need to reference previous messages or conversations.',
    parameters: z.object({
        conversationId: z.string().describe('The conversation ID to fetch messages from'),
        limit: z.number().optional().describe('Maximum number of messages to fetch (default: 20)'),
    }),

    execute: async ({ conversationId, limit = 20 }) => {
        // Log when tool is called
        console.log('🔧 TOOL CALLED: fetchConversationHistory');
        console.log('📋 Parameters:', { conversationId, limit });
        console.log('⏰ Timestamp:', new Date().toISOString());

        try {
            const messages = await ChatMessage.find({
                conversationId,
            })
                .sort({ timestamp: -1 })
                .limit(limit)
                .select('message sender timestamp')
                .lean();

            if (!messages || messages.length === 0) {
                console.log('📭 No messages found for conversation:', conversationId);
                return {
                    success: true,
                    messages: [],
                    count: 0,
                };
            }

            console.log('✅ Tool execution successful. Found', messages.length, 'messages');
            return {
                success: true,
                messages: messages.map(message => ({
                    role: message.sender === 'user' ? 'user' : 'assistant',
                    content: message.message,
                    createdAt: message.created_at,
                })),
                count: messages.length,
            };
        } catch (error) {
            console.error('❌ Tool execution failed:', error);
            return {
                success: false,
                messages: [],
                count: 0,
            };
        }

    }
})