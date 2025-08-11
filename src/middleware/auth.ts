import { Response, NextFunction } from 'express';
import admin from '../config/firebase';
import { throw_error } from '../utils/throw-error';

import { TAuthenticatedRequest } from '../types/shared';

const authenticate_user = async (req: TAuthenticatedRequest, res: Response, next: NextFunction) => {

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        throw_error({ message: 'Token is missing', status_code: 403 });
        return;
    }

    const decoded_token = await admin.auth().verifyIdToken(token);

    if (!decoded_token.uid || !decoded_token.email) {
        throw_error({ message: 'Token is invalid', status_code: 403 });
        return;
    }

    // Store user info on request object
    req.user = {
        uid: decoded_token.uid,
        email: decoded_token.email || '',
        name: decoded_token.name,
    };

    next();
}

export { authenticate_user };
