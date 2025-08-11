import { Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

import { TAuthenticatedRequest } from '../../types/shared';

export const update_conversation = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const { id } = z_update_conversation_req_params.parse(req.params);
    const { title } = z_update_conversation_req_body.parse(req.body);

    const firebase_user = req.user;
    
    const db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid }).lean();
    if (!db_user) {
        throw_error({ message: 'User not found', status_code: 404 });
        return;
    }

    const conversation = await mg.Conversation.findOneAndUpdate(
        { _id: id, user_id: db_user._id },
        { title },
        { new: true }
    ).lean();

    if (!conversation) {
        throw_error({ message: 'Conversation not found', status_code: 404 });
    }

    res.status(200).json({
        message: "Conversation updated successfully",
        data: conversation
    });
};

const z_update_conversation_req_params = z.object({
    id: z.string().min(1, 'id is required')
});

const z_update_conversation_req_body = z.object({
    title: z.string().min(1, 'title is required')
});
