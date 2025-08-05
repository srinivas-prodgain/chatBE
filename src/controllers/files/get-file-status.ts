import { Request, Response } from 'express';
import { z } from 'zod';
import { DocumentFile } from '../../models/document-file';

export const get_file_status = async ({ req, res }: { req: Request, res: Response }) => {
    try {
        const { file_id } = z_get_file_status_req_params.parse(req.params);

        const document_file = await DocumentFile.findById(file_id);

        if (!document_file) {
            res.status(404).json({
                message: "File not found",
                data: null
            });
            return;
        }

        res.status(200).json({
            message: "File status retrieved successfully",
            data: {
                file_id: document_file._id.toString(),
                file_name: document_file.file_name,
                file_size: document_file.file_size,
                file_type: document_file.file_type,
                upload_date: document_file.upload_date,
                processing_status: document_file.processing_status,
                chunk_count: document_file.chunk_count,
                error_message: document_file.error_message,
                created_at: document_file.created_at,
                updated_at: document_file.updated_at
            }
        });

    } catch (error: unknown) {
        const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Get file status error:', error);
        res.status(500).json({ message: `Failed to get file status: ${error_message}` });
    }
};

const z_get_file_status_req_params = z.object({
    file_id: z.string()
});