import { Request, Response } from 'express';
import { documentEmbeddingsMongoDBService } from '../../lib/document-embeddings-mongodb-service';

export const get_all_files_meta_data = async (req: Request, res: Response) => {
    const files = await documentEmbeddingsMongoDBService.getAllFiles();
    res.json({ data: files, message: "Files fetched successfully" });
};
