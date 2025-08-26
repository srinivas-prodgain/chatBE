import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';

import { TResponseRequest } from '../../types/shared';
import { ObjectId } from 'mongoose';


export type TUserData = {
    _id: ObjectId;
    email: string;
    name: string;
    role: string;
    firebase_uid: string;
    last_login: Date;
    created_at: Date;
    updated_at: Date;
}

export const login = async ({ req, res }: TResponseRequest) => {
    const firebase_user = req.user;

    const db_user = await mg.User.findOneAndUpdate<TUserData>(
        { firebase_uid: firebase_user?.uid },
        { last_login: new Date() },
        { new: true }
    );

    if (!db_user) {
        throw_error({ message: 'User account does not exist. Please register first.', status_code: 404 });
        return;
    }


    const user_data: TUserData = {
        _id: db_user._id,
        email: db_user.email,
        name: db_user.name,
        role: db_user.role,
        firebase_uid: db_user.firebase_uid,
        last_login: db_user.last_login,
        created_at: db_user.created_at,
        updated_at: db_user.updated_at
    }

    res.status(200).json({
        message: 'User logged in successfully',
        data: user_data
    });
};