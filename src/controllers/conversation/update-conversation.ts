import { z } from 'zod';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

import { TResponseRequest } from '../../types/shared';

export const update_conversation = async ({ req, res }: TResponseRequest) => {
    const { id } = z_update_conversation_req_params.parse(req.params);
    const { title } = z_update_conversation_req_body.parse(req.body);

    const conversation = await mg.Conversation.findOneAndUpdate(
        { _id: id },
        { title }
    ).lean();

    if (!conversation) {
        throw_error({ message: 'Conversation not found', status_code: 404 });
        return;
    }

    res.status(200).json({
        message: "Conversation updated successfully"
    });
};

const z_update_conversation_req_params = z.object({
    id: z.string().min(1, 'id is required')
});

const z_update_conversation_req_body = z.object({
    title: z.string().min(1, 'title is required')
});
