import { Response } from 'express';
import { document_embeddings_mongodb_service } from '../../services/document-embeddings-mongodb-service';

import { TAuthenticatedRequest } from '../../types/shared';

export const get_all_files_meta_data = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    const user_id = req.user?.user_id;

    const files = await document_embeddings_mongodb_service.get_all_files({ user_id: user_id || "" });
    res.status(200).json({
        message: "Files metadata retrieved successfully",
        data: files
    });
};
