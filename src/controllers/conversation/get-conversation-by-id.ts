import { Request, Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

export const get_conversation_by_id = async (req: Request, res: Response) => {
    const { uid } = z_get_conversation_by_id_req_params.parse(req.params);

    // Find conversation by uid
    const conversation = await mg.Conversation.findOne({ uid });

    if (!conversation) {
        throw_error('Conversation not found', 404);
        return; // This line helps TypeScript understand that conversation is not null below
    }

    // Get messages separately using conversationId
    const messages = await mg.ChatMessage.find({ conversationId: conversation._id })
        .sort({ createdAt: 1 })
        .select('message sender createdAt');

    // Return conversation with messages in the new populated format
    const conversationWithMessages = {
        ...conversation.toObject(),
        messages
    };

    res.status(200).json({
        data: conversationWithMessages,
        message: "Conversation fetched successfully"
    });
};

const z_get_conversation_by_id_req_params = z.object({
    uid: z.string().min(1, 'Conversation ID is required')
});
