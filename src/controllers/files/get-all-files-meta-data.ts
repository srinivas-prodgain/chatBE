import { document_embeddings_mongodb_service } from '../../classes/document-embeddings-mongodb-service';

import { TResponseRequest } from '../../types/shared';

export const get_all_files_meta_data = async ({ req, res }: TResponseRequest) => {
    const user_id = req.user.user_id;

    const files = await document_embeddings_mongodb_service.get_all_files({ user_id });
    res.status(200).json({
        message: "Files metadata retrieved successfully",
        data: files
    });
};
