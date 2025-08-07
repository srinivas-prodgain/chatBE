import { Request, Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { CONVERSATION_TITLE_MAX_LENGTH } from '../../constants/file-upload';

export const create_conversation = async ({ req, res }: { req: Request, res: Response }) => {
    const { title, user_id } = z_create_conversation_req_body.parse(req.body);

    console.log('Request body:', req.body);
    const conversation = await mg.Conversation.create({
        title: title || 'New Chat',
        user_id
    });

    console.log('Conversation created:', conversation);

    res.status(201).json({
        message: "Conversation created successfully",
        data: {
            _id: conversation._id,
            title: conversation.title,
            user_id: conversation.user_id,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at
        }
    });

};

const z_create_conversation_req_body = z.object({
    title: z.string().max(CONVERSATION_TITLE_MAX_LENGTH).optional(),
    user_id: z.string().min(1, 'user_id is required')
});