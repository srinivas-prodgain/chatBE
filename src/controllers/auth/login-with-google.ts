import { Response } from 'express';
import { z } from 'zod';
import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

import { TAuthenticatedRequest } from '../../types/shared';

export const login_with_google = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const firebase_user = req.user;

    let db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid });
    let is_new_user = false;

    if (!db_user) {
        is_new_user = true;

        db_user = new mg.User({
            firebase_uid: firebase_user?.uid || '',
            name: firebase_user?.name || '',
            email: firebase_user?.email || '',
            role: 'user',
            last_login: new Date()
        });

        await db_user.save();

        if (!db_user) {
            throw_error({ message: 'Failed to create new user', status_code: 500 });
            return;
        }
    } else {
        // Update last login for existing user
        db_user.last_login = new Date();
        await db_user.save();
    }

    res.status(is_new_user ? 201 : 200).json({
        message: is_new_user ? 'Google user registered successfully' : 'Google login successful',
        data: {
            _id: db_user._id,
            email: db_user.email,
            name: db_user.name,
            role: db_user.role,
            firebase_uid: db_user.firebase_uid,
            last_login: db_user.last_login,
            created_at: db_user.created_at,
            updated_at: db_user.updated_at
        },
        isNewUser: is_new_user
    });
};

const z_google_login_req_body = z.object({
    name: z.string().optional(),
});