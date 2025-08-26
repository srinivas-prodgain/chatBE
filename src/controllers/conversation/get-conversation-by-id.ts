import { z } from 'zod';

import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';


import { TResponseRequest } from '../../types/shared';

export const get_conversation_by_id = async ({ req, res }: TResponseRequest) => {
    const { id } = z_get_conversation_by_id_req_params.parse(req.params);


    const conversation = await mg.Conversation.findOne({ _id: id }).lean();

    if (!conversation) {
        throw_error({ message: 'Conversation not found', status_code: 404 });
        return;
    }

    const messages = await mg.ChatMessage.find({ conversation_id: conversation._id })
        .sort({ created_at: 1 })
        .select('message sender created_at').lean();


    const conversation_with_messages = {
        ...conversation,
        messages
    };



    res.status(200).json({
        data: conversation_with_messages,
        message: "Conversation fetched successfully"
    });
};

const z_get_conversation_by_id_req_params = z.object({
    id: z.string().min(1, 'id is required')
});
