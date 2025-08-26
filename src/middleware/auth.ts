import { Response, NextFunction } from 'express';
import admin from '../config/firebase';
import { throw_error } from '../utils/throw-error';

import { mg } from '../config/mg';
import { ObjectId } from 'mongodb';
import { Request } from 'express';


export type TAuthMiddleware = Request & {
    user?: {
        uid: string;
        user_id: string;
        email: string;
        name?: string;
        role: string;
    };
};


const authenticate_user = async (req: TAuthMiddleware, res: Response, next: NextFunction) => {

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        throw_error({ message: 'Token is missing', status_code: 401 });
        return;
    }

    const decoded_token = await admin.auth().verifyIdToken(token);

    if (!decoded_token.uid || !decoded_token.email) {
        throw_error({ message: 'Token is invalid', status_code: 401 });
        return;
    }

    const db_user = await mg.User.findOne<{ _id: ObjectId, role: string }>({ firebase_uid: decoded_token.uid })
    if (!db_user) {
        throw_error({ message: 'User not found', status_code: 401 });
        return;
    }

    req.user = {
        uid: decoded_token.uid,
        user_id: db_user._id.toString(),
        email: decoded_token.email,
        name: decoded_token.name,
        role: db_user.role,
    };

    next();
}

export { authenticate_user };
