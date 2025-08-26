import { z } from 'zod';

import { mg } from '../../config/mg';
import { CONVERSATION_TITLE_MAX_LENGTH } from '../../constants/file-upload';


import { TResponseRequest } from '../../types/shared';

export const create_conversation = async ({ req, res }: TResponseRequest) => {
    const { title } = z_create_conversation_req_body.parse(req.body);

    const user_id = req.user.user_id;

    const conversation = await mg.Conversation.create({
        title: title || 'New Chat',
        user_id
    });

    res.status(201).json({
        message: "Conversation created successfully",
        data: {
            _id: conversation._id
        }
    });
};

const z_create_conversation_req_body = z.object({
    title: z.string().max(CONVERSATION_TITLE_MAX_LENGTH).optional(),
});