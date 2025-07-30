import { Request, Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

export const update_conversation = async ({ req, res }: { req: Request, res: Response }) => {
    const { uid } = z_update_conversation_req_params.parse(req.params);
    const { title } = z_update_conversation_req_body.parse(req.body);

    const conversation = await mg.Conversation.findOne({ uid });

    if (!conversation) {
        throw_error({ message: 'Conversation not found', status_code: 404 });
    }

    const updatedConversation = await mg.Conversation.findOneAndUpdate(
        { uid },
        { title, updatedAt: new Date() },
        { new: true }
    );

    res.json({ data: updatedConversation, message: 'Conversation updated successfully' });
};

const z_update_conversation_req_params = z.object({
    uid: z.string().min(1, 'Conversation ID is required')
});

const z_update_conversation_req_body = z.object({
    title: z.string().min(1, 'Title is required')
});
