import { generateText, Message } from "ai";
import { mg } from "../config/mg";
import { TMessage } from "../types/message";
import { mistralModel } from "../services/ai";
import { encoding_for_model, TiktokenModel, Tiktoken } from '@dqbd/tiktoken';
import { Types } from "mongoose";
import { generate_initial_summary_prompt, generate_update_summary_prompt } from "./system-prompts";
import {
    INITIAL_SUMMARY_TRIGGER,
    SUMMARY_UPDATE_TRIGGER,
    TOKEN_OVERHEAD_PER_MESSAGE,
    FALLBACK_CHARS_PER_TOKEN,
    SUMMARY_TEMPERATURE,
    SUMMARY_MAX_TOKENS
} from "../constants/memory-manager";

type TConversationUpdate = {
    summary?: string;
    summaryVersion?: number;
    lastSummarizedMessageIndex?: number;
    lastTokenCount?: number;
};

let encoder: Tiktoken | null = null;

const get_encoder = (model: TiktokenModel = 'gpt-4o'): Tiktoken => {
    if (!encoder) {
        encoder = encoding_for_model(model);
    }
    return encoder;
};

const cleanup_encoder = (): void => {
    if (encoder) {
        encoder.free();
        encoder = null;
    }
};

const count_tokens = ({ messages }: { messages: TMessage[] }): number => {
    try {
        const tokenizer = get_encoder();
        let total_tokens = 0;

        for (const message of messages) {
            const tokens = tokenizer.encode(message.message);
            total_tokens += tokens.length;
            // Add a small overhead for message metadata (role, timestamps, etc.)
            total_tokens += TOKEN_OVERHEAD_PER_MESSAGE;
        }

        return total_tokens;
    } catch (error) {
        console.error('Error counting tokens:', error);
        // Fallback: approximate 4 chars per token
        return Math.ceil(messages.reduce((total, msg) => total + msg.message.length, 0) / FALLBACK_CHARS_PER_TOKEN);
    }
};

const generate_summary = async ({ messages }: { messages: TMessage[] }): Promise<string> => {
    console.log('🔍 Generating summary for messages:', messages.length);
    const prompt = generate_initial_summary_prompt({ messages: messages.map(m => `${m.sender}: ${m.message}\n`) });
    if (messages.length === 0) {
        return "Empty conversation.";
    }

    try {
        const summary = await generateText({
            model: mistralModel,
            prompt: prompt,
            temperature: SUMMARY_TEMPERATURE,
            maxTokens: SUMMARY_MAX_TOKENS
        });
        return summary.text;
    } catch (error) {
        console.error('Error generating summary:', error);
        return `Summary of ${messages.length} messages discussing various topics.`;
    }
};

const generate_summary_updated = async ({ messages, prev_summary }: { messages: TMessage[], prev_summary: string }): Promise<string> => {
    if (messages.length === 0) {
        return prev_summary;
    }

    const prompt = generate_update_summary_prompt({ messages: messages.map(m => `${m.sender}: ${m.message}\n`), previous_summary: prev_summary });

    try {
        const summary = await generateText({
            model: mistralModel,
            prompt: prompt,
            temperature: SUMMARY_TEMPERATURE,
            maxTokens: SUMMARY_MAX_TOKENS
        });
        return summary.text;
    } catch (error) {
        console.error('Error updating summary:', error);
        return `${prev_summary}\n\nAdditional discussion with ${messages.length} new messages.`;
    }
};

export const hybrid_memory_manager = async ({ conversationId }: { conversationId: Types.ObjectId }): Promise<{ summary: string, messagesToSend: Message[] }> => {
    try {
        const conversation = await mg.Conversation.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const messages = await mg.ChatMessage.find({ conversationId })
            .sort({ createdAt: 1 })
            .lean();

        let messages_to_analyze: TMessage[] = [];

        const prev_summary = conversation.summary || "";
        const prev_summary_version = conversation.summaryVersion || 0;
        const prev_last_summarized_index = conversation.lastSummarizedMessageIndex || 0;

        console.log(`🔍 Prev last summarized index: ${prev_last_summarized_index}`);

        if (prev_last_summarized_index === 0) {
            messages_to_analyze = messages.slice(0, -1);
        }
        else {
            messages_to_analyze = messages.slice(prev_last_summarized_index + 1, -1);
        }

        const tokens_to_analyze = count_tokens({ messages: messages_to_analyze });

        console.log(`🔍 Tokens to analyze: ${tokens_to_analyze}`);
        console.log(`🔍 Messages to analyze: ${messages_to_analyze.length}`);

        let summary = prev_summary;
        let messages_to_send: TMessage[] = [];
        let should_update_db = false;
        let db_update_data: TConversationUpdate = {};

        if (prev_summary_version === 0) {
            if (tokens_to_analyze >= INITIAL_SUMMARY_TRIGGER) {
                console.log(`🔄 Creating initial summary. Total tokens: ${tokens_to_analyze}`);
                summary = await generate_summary({ messages: messages_to_analyze });
                messages_to_send = messages.slice(-1);

                should_update_db = true;
                db_update_data = {
                    summary,
                    summaryVersion: 1,
                    lastSummarizedMessageIndex: messages_to_analyze.length - 1,
                    lastTokenCount: 0
                };

                console.log("executed the if (if) block")

            } else {
                // No summary needed yet, return all messages
                messages_to_send = messages;
                console.log(`🔍 Messages to send: ${messages_to_send.length}`);

                should_update_db = true;
                db_update_data = { lastTokenCount: tokens_to_analyze };

                console.log("executed the if (else) block")
            }
        } else {
            // Summary exists, check if update needed
            if (tokens_to_analyze >= SUMMARY_UPDATE_TRIGGER) {
                console.log(`🔄 Updating summary. New tokens: ${tokens_to_analyze}`);

                summary = await generate_summary_updated({ messages: messages_to_analyze, prev_summary });
                messages_to_send = messages.slice(-1);

                should_update_db = true;
                db_update_data = {
                    summary,
                    summaryVersion: prev_summary_version + 1,
                    lastSummarizedMessageIndex: prev_last_summarized_index + messages_to_analyze.length,
                    lastTokenCount: 0
                };

                console.log("executed the else (if) block")

            } else {
                // No summary update needed, return recent messages
                messages_to_send = messages.slice(prev_last_summarized_index + 1);

                should_update_db = true;
                db_update_data = { lastTokenCount: tokens_to_analyze };
                console.log("executed the else (else) block")
            }
        }

        // Update database if needed
        if (should_update_db) {
            await mg.Conversation.findByIdAndUpdate(conversationId, db_update_data);
        }

        // Convert to AI Message format
        const messages_to_send_ai_format: Message[] = messages_to_send.map((m, index) => ({
            id: m._id?.toString() || `msg-${index}`,
            role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
            content: m.message
        }));

        console.log("messages_to_send :", messages_to_send.length);
        console.log(`📊 Memory Stats - `, db_update_data);

        return { summary, messagesToSend: messages_to_send_ai_format };

    } catch (error) {
        console.error('❌ Error in hybrid_memory_manager:', error);

        // Fallback: return empty summary and try to get recent messages
        try {
            const fallback_messages = await mg.ChatMessage.find({ conversationId })
                .sort({ createdAt: -1 })
                .limit(1)
                .lean();

            const fallback_messages_ai_format: Message[] = fallback_messages.reverse().map((m, index) => ({
                id: m._id?.toString() || `msg-${index}`,
                role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: m.message
            }));

            return { summary: "", messagesToSend: fallback_messages_ai_format };
        } catch (fallback_error) {
            console.error('❌ Fallback also failed:', fallback_error);
            return { summary: "", messagesToSend: [] };
        }
    } finally {
        cleanup_encoder();
    }
};

// Export utility functions for testing/debugging
export { count_tokens, generate_summary, generate_summary_updated, cleanup_encoder };