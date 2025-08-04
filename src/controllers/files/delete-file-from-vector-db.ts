import { Request, Response } from 'express';
import { z } from 'zod';

import { document_embeddings_mongodb_service } from '../../services/document-embeddings-mongodb-service';

export const delete_file_from_vector_db = async ({ req, res }: { req: Request, res: Response }) => {
    const { file_id } = z_delete_file_from_vector_db_req_params.parse(req.params);

    await document_embeddings_mongodb_service.delete_document({ file_id });

    res.status(200).json({
        message: "File deleted successfully from vector database",
        data: null
    });
};

const z_delete_file_from_vector_db_req_params = z.object({
    file_id: z.string().min(1, 'file_id is required')
});

