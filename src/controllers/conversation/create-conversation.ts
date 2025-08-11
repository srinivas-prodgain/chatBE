import { Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { CONVERSATION_TITLE_MAX_LENGTH } from '../../constants/file-upload';
import { throw_error } from '../../utils/throw-error';


import { TAuthenticatedRequest } from '../../types/shared';

export const create_conversation = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const { title } = z_create_conversation_req_body.parse(req.body);

    const firebase_user = req.user;

    const db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid }).lean();
    if (!db_user) {
        throw_error({ message: 'User not found', status_code: 404 });
        return;
    }

    const conversation = await mg.Conversation.create({
        title: title || 'New Chat',
        user_id: db_user._id,
    });

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
});