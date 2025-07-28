import { Request, Response } from 'express';
import { documentEmbeddingsMongoDBService } from '../../lib/document-embeddings-mongodb-service';
import { z } from 'zod';
import { throw_error } from '../../utils/throw-error';

export const delete_file_from_vector_db = async (req: Request, res: Response) => {
    try {
        // Validate input
        const { fileId } = z_delete_file_from_vector_db_req_params.parse(req.params);

        await documentEmbeddingsMongoDBService.deleteDocument(fileId);
        res.json({ message: 'File deleted from vector db' });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            throw_error('Invalid request parameters', 400);
        }
        throw_error(error.message || 'Failed to delete file', 500);
    }
};

const z_delete_file_from_vector_db_req_params = z.object({
    fileId: z.string().min(1, 'File ID is required')
});

