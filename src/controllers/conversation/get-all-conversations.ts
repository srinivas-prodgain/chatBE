import { Request, Response } from 'express';
import { z } from 'zod';

import { mg } from '../../config/mg';

export const get_all_conversations = async ({ req, res }: { req: Request, res: Response }) => {
    const { page, limit } = z_get_all_conversations_req_query.parse(req.query);
    const { userId } = z_get_all_conversations_req_params.parse(req.params);

    const skip = (page - 1) * limit;

    const [conversations, total_items] = await Promise.all([
        mg.Conversation.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        mg.Conversation.countDocuments({ userId })
    ]);

    const total_pages = Math.ceil(total_items / limit);

    res.status(200).json({
        message: "Conversations retrieved successfully",
        data: conversations,
        pagination: {
            page,
            limit,
            total_pages,
            total_items
        }
    });
};

const z_get_all_conversations_req_query = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
});

const z_get_all_conversations_req_params = z.object({
    userId: z.string().min(1, 'userId is required'),
});
