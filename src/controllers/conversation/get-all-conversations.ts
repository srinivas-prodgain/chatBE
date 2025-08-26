import { z } from 'zod';

import { mg } from '../../config/mg';

import { TResponseRequest } from '../../types/shared';

export const get_all_conversations = async ({ req, res }: TResponseRequest) => {
    const { page, limit } = z_get_all_conversations_req_query.parse(req.query);

    const user_id = req.user.user_id;

    const skip = (page - 1) * limit;

    const get_conversations = mg.Conversation.find({ user_id })
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();


    const get_total_items = mg.Conversation.countDocuments({ user_id });

    const [conversations_data, total_items] = await Promise.all([
        get_conversations,
        get_total_items
    ]);



    const total_pages = Math.ceil(total_items / limit);

    res.status(200).json({
        message: "Conversations retrieved successfully",
        data: conversations_data,
        pagination: {
            page,
            limit,
            total_pages,
            total_items
        }
    });
};

const z_get_all_conversations_req_query = z.object({
    page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10')
});

