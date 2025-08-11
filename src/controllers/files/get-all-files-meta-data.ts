import { Response } from 'express';
import { document_embeddings_mongodb_service } from '../../services/document-embeddings-mongodb-service';
import { throw_error } from '../../utils/throw-error';
import { mg } from '../../config/mg';

import { TAuthenticatedRequest } from '../../types/shared';

export const get_all_files_meta_data = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const firebase_user = req.user;

    const db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid }).lean();
    if (!db_user) {
        throw_error({ message: 'User not found', status_code: 404 });
        return;
    }

    const files = await document_embeddings_mongodb_service.get_all_files({ user_id: db_user._id.toString() });
    res.status(200).json({
        message: "Files metadata retrieved successfully",
        data: files
    });
};
