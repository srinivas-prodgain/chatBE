import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';
import { TConversation } from '../../types/conversation';

export const delete_conversation = async ({ req, res }: { req: Request, res: Response }) => {
    const { id } = z_delete_conversation_req_params.parse(req.params);

    const conversation = await mg.Conversation.findById<TConversation>(id);
    if (!conversation) {
        throw_error({ message: 'Conversation not found', status_code: 404 });
    }

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
        // Delete all messages associated with this conversation
        await mg.ChatMessage.deleteMany({ conversationId: conversation?._id }, { session });

        // Delete the conversation
        await mg.Conversation.findByIdAndDelete(id, { session });
    });
    await session.endSession();

    return res.status(200).json({
        message: "Conversation deleted successfully",
        data: null
    });
};

const z_delete_conversation_req_params = z.object({
    id: z.string().min(1, 'Conversation ID is required')
});