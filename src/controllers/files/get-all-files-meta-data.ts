import { Request, Response } from 'express';
import { document_embeddings_mongodb_service } from '../../services/document-embeddings-mongodb-service';

export const get_all_files_meta_data = async ({ req, res }: { req: Request, res: Response }) => {
    const files = await document_embeddings_mongodb_service.get_all_files();

    res.status(200).json({
        message: "Files metadata retrieved successfully",
        data: files
    });
};
