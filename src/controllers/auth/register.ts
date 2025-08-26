import { Request, Response } from 'express';
import { z } from 'zod';
import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';
import admin from '../../config/firebase';
import { ObjectId } from 'mongoose';
import { TUserData } from './login';






export const register = async ({ req, res }: { req: Request, res: Response }) => {
    const token = req.headers.authorization?.split(' ')[1];

    const { name } = z_register_req_body.parse(req.body);


    if (!token) {
        throw_error({ message: 'Token is missing', status_code: 401 });
        return;
    }

    const decoded_token = await admin.auth().verifyIdToken(token);

    if (!decoded_token.uid || !decoded_token.email) {
        throw_error({ message: 'Token is invalid', status_code: 401 });
        return;
    }

    

    // Check if user already exists
    const existing_user = await mg.User.findOne({ firebase_uid: decoded_token.uid });

    if (existing_user) {
        throw_error({
            message: `User with email ${decoded_token.email} already exists. Please login instead.`,
            status_code: 409
        });
        return;
    }

    // Create new user in database
    const new_user = await mg.User.create({
        firebase_uid: decoded_token.uid,
        name: name || decoded_token.name,
        email: decoded_token.email,
        role: 'user',
        last_login: new Date()
    });

    if (!new_user) {
        throw_error({ message: 'Failed to create new user', status_code: 500 });
        return;
    }


    const user_data: TUserData = {
        _id: new_user._id as ObjectId,
        email: new_user.email,
        name: new_user.name,
        role: new_user.role,
        firebase_uid: new_user.firebase_uid,
        last_login: new_user.last_login,
        created_at: new_user.created_at,
        updated_at: new_user.updated_at
    }

    res.status(201).json({
        message: 'User registered successfully',
        data: user_data
    });
};

const z_register_req_body = z.object({
    name: z.string().min(1, 'name is required').optional(),
});