import { Response } from 'express';
import { z } from 'zod';
import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

import { TAuthenticatedRequest } from '../../types/shared';

export const register = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const { name } = z_register_req_body.parse(req.body);
    const firebase_user = req.user;

    // Check if user already exists
    const existing_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid });

    if (existing_user) {
        throw_error({
            message: `User with email ${firebase_user?.email} already exists. Please login instead.`,
            status_code: 409
        });
        return;
    }

    // Create new user in database
    const new_user = await mg.User.create({
        firebase_uid: firebase_user?.uid || '',
        name: name || firebase_user?.name || '',
        email: firebase_user?.email || '',
        role: 'user',
        last_login: new Date()
    });

    if (!new_user) {
        throw_error({ message: 'Failed to create new user', status_code: 500 });
        return;
    }


    res.status(201).json({
        message: 'User registered successfully',
        data: {
            _id: new_user._id,
            email: new_user.email,
            name: new_user.name,
            role: new_user.role,
            firebase_uid: new_user.firebase_uid,
            created_at: new_user.created_at,
            updated_at: new_user.updated_at
        }
    });
};

const z_register_req_body = z.object({
    name: z.string().min(1, 'name is required').optional(),
});