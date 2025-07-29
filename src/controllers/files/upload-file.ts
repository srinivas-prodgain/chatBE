import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from '../../types/file';
import { documentEmbeddingsMongoDBService, TProcessedDocument } from '../../lib/document-embeddings-mongodb-service';

// Upload response type (without chunks to reduce payload size)
export type TUploadResponse = {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    chunksCreated: number;
}

export const handle_upload = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        send_upload_progress(uploadId, 5, 'Upload started...', res);
        send_upload_start(uploadId, req.file.originalname, req.file.size, res);

        if (req.file.size === 0) {
            send_upload_error(uploadId, 'Invalid file upload - file is empty', res);
            return;
        }

        if (req.file.size > MAX_FILE_SIZE) {
            send_upload_error(uploadId, 'File size exceeds 10MB limit', res);
            return;
        }

        send_upload_progress(uploadId, 10, 'File size validation passed', res);

        const file_extension = path.extname(req.file.originalname).toLowerCase();
        const allowed_extensions = Object.values(ALLOWED_FILE_EXTENSIONS).flat();

        if (!allowed_extensions.includes(file_extension)) {
            send_upload_error(uploadId, 'File type not supported. Supported formats: PDF, TXT, DOCX, MD', res);
            return;
        }

        send_upload_progress(uploadId, 15, `${file_extension.toUpperCase()} file format validated`, res);

        send_upload_progress(uploadId, 20, 'File saved to temporary storage', res);
        await new Promise(resolve => setTimeout(resolve, 300));

        send_upload_progress(uploadId, 25, 'Starting document processing...', res);

        const processedDocument = await documentEmbeddingsMongoDBService.processAndStoreDocument(
            req.file.path,
            req.file.originalname,
            req.file.size,
            req.file.mimetype,
            (progress: number, message: string) => {
                const adjustedProgress = 25 + (progress * 0.7);
                send_upload_progress(uploadId, Math.round(adjustedProgress), message, res);
            }
        );

        send_upload_progress(uploadId, 96, 'Cleaning up temporary files...', res);
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        await new Promise(resolve => setTimeout(resolve, 200));

        send_upload_progress(uploadId, 100, 'Upload completed successfully!', res);
        send_upload_complete(uploadId, {
            fileId: processedDocument.fileId,
            fileName: processedDocument.fileName,
            fileSize: processedDocument.fileSize,
            fileType: processedDocument.fileType,
            chunksCreated: processedDocument.chunksCreated
        }, res);

        console.log(`File processed successfully: ${req.file.originalname} (${processedDocument.chunksCreated} chunks)`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('File processing error:', error);
        send_upload_error(uploadId, `File processing failed: ${errorMessage}`, res);

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
};

const send_upload_progress = (uploadId: string, progress: number, message?: string, res?: Response): void => {
    const eventData = {
        type: 'progress',
        uploadId,
        progress,
        message: message || `Progress: ${progress}%`,
        timestamp: new Date().toISOString()
    };

    res?.write(`data: ${JSON.stringify(eventData)}\n\n`);
};

const send_upload_start = (uploadId: string, fileName: string, fileSize: number, res: Response): void => {
    const eventData = {
        type: 'start',
        uploadId,
        fileName,
        fileSize,
        timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
};

const send_upload_error = (uploadId: string, message: string, res: Response): void => {
    const eventData = {
        type: 'error',
        uploadId,
        message,
        timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    res.end();
};

const send_upload_complete = (uploadId: string, data: TUploadResponse, res: Response): void => {
    const eventData = {
        type: 'complete',
        uploadId,
        data,
        timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    res.end();
};


