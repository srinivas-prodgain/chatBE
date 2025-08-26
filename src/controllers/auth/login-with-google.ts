import { z } from 'zod';
import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

import { TResponseRequest } from '../../types/shared';
import { TUserData } from './login';
import { ObjectId } from 'mongoose';

export const login_with_google = async ({ req, res }: TResponseRequest) => {
    const firebase_user = req.user;

    let db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid });
    let is_new_user = false;

    if (!db_user) {
        is_new_user = true;


        db_user = await mg.User.create({
            firebase_uid: firebase_user?.uid,
            name: firebase_user?.name,
            email: firebase_user?.email,
            role: 'user',
            last_login: new Date()
        });

        if (!db_user) {
            throw_error({ message: 'Failed to create new user', status_code: 500 });
            return;
        }
    } else {
        db_user.last_login = new Date();
        await db_user.save();
    }

    const user_data: TUserData = {
        _id: db_user._id as ObjectId,
        email: db_user.email,
        name: db_user.name,
        role: db_user.role,
        firebase_uid: db_user.firebase_uid,
        last_login: db_user.last_login,
        created_at: db_user.created_at,
        updated_at: db_user.updated_at
    }

    res.status(is_new_user ? 201 : 200).json({
        message: is_new_user ? 'Google user registered successfully' : 'Google login successful',
        data: user_data,
        isNewUser: is_new_user
    });
};

const z_google_login_req_body = z.object({
    name: z.string().optional(),
});