import { z } from 'zod';
import mongoose from 'mongoose';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

import { TResponseRequest } from '../../types/shared';

export const delete_conversation = async ({ req, res }: TResponseRequest) => {
    const { id } = z_delete_conversation_req_params.parse(req.params);

    const conversation = await mg.Conversation.findOne({ _id: id });
    if (!conversation) {
        throw_error({ message: 'Conversation not found', status_code: 404 });
    }

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
        await mg.ChatMessage.deleteMany({ conversation_id: conversation?._id }, { session });
        await mg.Conversation.findByIdAndDelete(id, { session });
    });
    await session.endSession();

    res.status(200).json({
        message: "Conversation deleted successfully"
    });
};

const z_delete_conversation_req_params = z.object({
    id: z.string().min(1, 'Conversation ID is required')
});