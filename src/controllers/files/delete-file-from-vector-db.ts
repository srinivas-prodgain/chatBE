import { Request, Response } from 'express';
import { z } from 'zod';

import { documentEmbeddingsMongoDBService } from '../../services/document-embeddings-mongodb-service';
import { throw_error } from '../../utils/throw-error';

export const delete_file_from_vector_db = async ({ req, res }: { req: Request, res: Response }) => {
    try {
        // Validate input
        const { fileId } = z_delete_file_from_vector_db_req_params.parse(req.params);

        await documentEmbeddingsMongoDBService.deleteDocument({ fileId });

        res.status(200).json({
            message: 'File deleted successfully from vector database'
        });
    } catch (error: unknown) {
        console.error('Error deleting file:', error);
        if (error instanceof Error) {
            if (error.name === 'ZodError') {
                throw_error({ message: 'Invalid request parameters', status_code: 400 });
            }
            throw_error({ message: error.message || 'Failed to delete file', status_code: 500 });
        } else {
            throw_error({ message: 'Failed to delete file', status_code: 500 });
        }
    }
};

const z_delete_file_from_vector_db_req_params = z.object({
    fileId: z.string().min(1, 'File ID is required')
});

