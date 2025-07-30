import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

import { documentEmbeddingsMongoDBService, TProcessedDocument } from '../../services/document-embeddings-mongodb-service';
import {
    MAX_FILE_SIZE,
    UPLOAD_ID_RANDOM_LENGTH,
    UPLOAD_PROGRESS,
    ALLOWED_FILE_EXTENSIONS,
    SSE_HEADERS
} from '../../constants/file-upload';

// Type for allowed file extensions
type TAllowedExtension = '.pdf' | '.txt' | '.docx' | '.md';

// Upload response type (without chunks to reduce payload size)
export type TUploadResponse = {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    chunksCreated: number;
}

// Type guard function for file extension validation
const is_allowed_extension = (extension: string): extension is TAllowedExtension => {
    return ALLOWED_FILE_EXTENSIONS.DOCUMENTS.includes(extension as TAllowedExtension);
};

const send_upload_progress = ({ uploadId, progress, message, res }: { uploadId: string, progress: number, message?: string, res: Response }): void => {
    const eventData = {
        type: 'progress',
        uploadId,
        progress,
        message: message || `Progress: ${progress}%`,
        timestamp: new Date().toISOString()
    };

    res?.write(`data: ${JSON.stringify(eventData)}\n\n`);
};

const send_upload_start = ({ uploadId, fileName, fileSize, res }: { uploadId: string, fileName: string, fileSize: number, res: Response }): void => {
    const eventData = {
        type: 'start',
        uploadId,
        fileName,
        fileSize,
        timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
};

const send_upload_error = ({ uploadId, message, res }: { uploadId: string, message: string, res: Response }): void => {
    const eventData = {
        type: 'error',
        uploadId,
        message,
        timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    res.end();
};

const send_upload_complete = ({ uploadId, data, res }: { uploadId: string, data: TUploadResponse, res: Response }): void => {
    const eventData = {
        type: 'complete',
        uploadId,
        data,
        timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    res.end();
};

export const handle_upload = async ({ req, res }: { req: Request, res: Response }) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, UPLOAD_ID_RANDOM_LENGTH)}`;

    res.setHeader('Content-Type', SSE_HEADERS['Content-Type']);
    res.setHeader('Cache-Control', SSE_HEADERS['Cache-Control']);
    res.setHeader('Connection', SSE_HEADERS['Connection']);

    try {
        send_upload_progress({ uploadId, progress: UPLOAD_PROGRESS.STARTED, message: 'Upload started...', res });
        send_upload_start({ uploadId, fileName: req.file.originalname, fileSize: req.file.size, res });

        if (req.file.size === 0) {
            send_upload_error({ uploadId, message: 'Invalid file upload - file is empty', res });
            return;
        }

        if (req.file.size > MAX_FILE_SIZE) {
            send_upload_error({ uploadId, message: 'File size exceeds 10MB limit', res });
            return;
        }

        send_upload_progress({ uploadId, progress: UPLOAD_PROGRESS.SIZE_VALIDATED, message: 'File size validation passed', res });

        const file_extension = path.extname(req.file.originalname).toLowerCase();
        const allowed_extensions = ALLOWED_FILE_EXTENSIONS.DOCUMENTS;

        if (!is_allowed_extension(file_extension)) {
            send_upload_error({ uploadId, message: 'File type not supported. Supported formats: PDF, TXT, DOCX, MD', res });
            return;
        }

        send_upload_progress({ uploadId, progress: UPLOAD_PROGRESS.FORMAT_VALIDATED, message: `${file_extension.toUpperCase()} file format validated`, res });

        send_upload_progress({ uploadId, progress: UPLOAD_PROGRESS.TEMP_SAVED, message: 'File saved to temporary storage', res });
        await new Promise(resolve => setTimeout(resolve, 300));

        send_upload_progress({ uploadId, progress: UPLOAD_PROGRESS.PROCESSING_STARTED, message: 'Starting document processing...', res });

        const processedDocument = await documentEmbeddingsMongoDBService.processAndStoreDocument({
            filePath: req.file.path,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            progressCallback: (progress: number, message: string) => {
                const adjustedProgress = UPLOAD_PROGRESS.PROCESSING_STARTED + (progress * 0.7);
                send_upload_progress({ uploadId, progress: Math.round(adjustedProgress), message, res });
            }
        });

        send_upload_progress({ uploadId, progress: UPLOAD_PROGRESS.CLEANUP_STARTED, message: 'Cleaning up temporary files...', res });
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        await new Promise(resolve => setTimeout(resolve, 200));

        send_upload_progress({ uploadId, progress: UPLOAD_PROGRESS.COMPLETED, message: 'Upload completed successfully!', res });
        send_upload_complete({
            uploadId,
            data: {
                fileId: processedDocument.fileId,
                fileName: processedDocument.fileName,
                fileSize: processedDocument.fileSize,
                fileType: processedDocument.fileType,
                chunksCreated: processedDocument.chunksCreated
            },
            res
        });

        console.log(`File processed successfully: ${req.file.originalname} (${processedDocument.chunksCreated} chunks)`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('File processing error:', error);
        send_upload_error({ uploadId, message: `File processing failed: ${errorMessage}`, res });

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
};


