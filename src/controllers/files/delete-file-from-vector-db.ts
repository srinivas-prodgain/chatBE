import { Response } from 'express';
import { z } from 'zod';

import { document_embeddings_mongodb_service } from '../../services/document-embeddings-mongodb-service';
import { throw_error } from '../../utils/throw-error';
import { mg } from '../../config/mg';



import { TAuthenticatedRequest } from '../../types/shared';

export const delete_file_from_vector_db = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const { file_id } = z_delete_file_from_vector_db_req_params.parse(req.params);

    const firebase_user = req.user;

    const db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid }).lean();
    if (!db_user) {
        throw_error({ message: 'User not found', status_code: 404 });
        return;
    }

    await document_embeddings_mongodb_service.delete_document({ file_id, user_id: db_user._id.toString() });

    res.status(200).json({
        message: "File deleted successfully from vector database",
        data: null
    });
};

const z_delete_file_from_vector_db_req_params = z.object({
    file_id: z.string().min(1, 'file_id is required')
});

