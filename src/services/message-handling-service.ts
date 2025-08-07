import { mg } from '../config/mg';
import { throw_error } from '../utils/throw-error';
import { TConversation } from '../types/conversation';
import { CONVERSATION_TITLE_MAX_LENGTH } from '../constants/file-upload';
import { Types } from 'mongoose';

export type TMessageHandlingParams = {
    conversation_id: string;
    message: string;
    user_id: string;
};



export const message_handling_service = {
    async get_or_create_conversation({ conversation_id, message, user_id }: TMessageHandlingParams): Promise<TConversation> {
        let conversation = await mg.Conversation.findById<TConversation>(conversation_id);

        if (!conversation) {
            const title = message.substring(0, CONVERSATION_TITLE_MAX_LENGTH) || 'New Chat';
            conversation = new mg.Conversation({
                _id: conversation_id,
                title,
                user_id
            });
            await conversation.save();
        }

        return conversation;
    },

    async save_user_message({ message, conversation_id }: { message: string, conversation_id: Types.ObjectId }) {
        const user_message = new mg.ChatMessage({
            message,
            sender: 'user',
            conversation_id
        });
        await user_message.save();
    },

    async save_ai_message({ ai_response, conversation_id }: { ai_response: string, conversation_id: Types.ObjectId }) {
        if (!ai_response.trim()) {
            return;
        }

        const ai_message = new mg.ChatMessage({
            message: ai_response,
            sender: 'ai',
            conversation_id
        });

        const save_message_promise = ai_message.save();
        const update_conversation_promise = mg.Conversation.findByIdAndUpdate(conversation_id, { updated_at: new Date() });

        await Promise.all([save_message_promise, update_conversation_promise]);
    }
}; 