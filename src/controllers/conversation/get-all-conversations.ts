import { Request, Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';
import { TConversation } from '@/types/conversation';

export const get_all_conversations = async ({ req, res }: { req: Request, res: Response }) => {
    const { page, limit } = z_get_all_conversations_req_query.parse(req.query);
    const { user_id } = z_get_all_conversations_req_params.parse(req.params);

    const skip = (page - 1) * limit;

    const get_conversations = async (): Promise<TConversation[]> => {
        const conversations_list = await mg.Conversation.find({ user_id })
            .sort({ updated_at: -1 })
            .skip(skip)
            .limit(limit);
        return conversations_list;
    }

    const get_total_items = async (): Promise<number> => {
        const total_count = await mg.Conversation.countDocuments({ user_id });
        return total_count;
    }

    const [conversations_data, total_items] = await Promise.all([
        get_conversations(),
        get_total_items()
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

const z_get_all_conversations_req_params = z.object({
    user_id: z.string().min(1, 'user_id is required')
});
