import { Response } from 'express';
import fs from 'fs';
import path from 'path';

import { document_embeddings_mongodb_service } from '../../services/document-embeddings-mongodb-service';
import { DocumentFile } from '../../models/document-file';
import {
    MAX_FILE_SIZE,
    ALLOWED_FILE_EXTENSIONS,
} from '../../constants/file-upload';
import { TAllowedFileTypes,TProcessStatus } from '../../types/shared';
import { throw_error } from '../../utils/throw-error';
import { mg } from '../../config/mg';


// Type for allowed file extensions

// Upload response type for immediate response
export type TUploadResponse = {
    file_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    user_id: string;
    status: TProcessStatus;
    message: string;
}


import { TAuthenticatedRequest } from '../../types/shared';

// Type guard function for file extension validation
const is_allowed_extension = (extension: string): extension is TAllowedFileTypes => {
    return ALLOWED_FILE_EXTENSIONS.DOCUMENTS.some(allowed => allowed === extension);
};

// Background processing function
const process_file_in_background = async ({ file_path, file_id, file_name, file_size, mime_type, user_id }: {
    file_path: string;
    file_id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    user_id: string;
}): Promise<void> => {
    try {
        console.log(`Starting background processing for file: ${file_name} (ID: ${file_id})`);

        // Update status to processing
        await DocumentFile.findOneAndUpdate(
            { _id: file_id },
            { processing_status: 'processing' }
        );

        // Process the document (this will handle status updates internally)
        await document_embeddings_mongodb_service.process_and_store_document({
            file_path,
            file_name,
            file_size,
            mime_type,
            file_id,
            user_id
        });

        console.log(`Background processing completed for file: ${file_name}`);

    } catch (error: unknown) {
        const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Background processing failed for file ${file_name}:`, error);

        // Update status to failed
        await DocumentFile.findOneAndUpdate(
            { _id: file_id },
            {
                processing_status: 'failed',
                error_message: error_message
            }
        );
    } finally {
        // Clean up temporary file
        if (fs.existsSync(file_path)) {
            fs.unlinkSync(file_path);
            console.log(`Cleaned up temporary file: ${file_path}`);
        }
    }
};

export const handle_upload = async ({ req, res }: { req: TAuthenticatedRequest, res: Response }) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    const firebase_user = req.user;


    const db_user = await mg.User.findOne({ firebase_uid: firebase_user?.uid }).lean();
    if (!db_user) {
        throw_error({ message: 'User not found', status_code: 404 });
        return;
    }

    try {
        // Validate file size
        if (req.file.size === 0) {
            res.status(400).json({ message: 'Invalid file upload - file is empty' });
            return;
        }

        if (req.file.size > MAX_FILE_SIZE) {
            res.status(400).json({ message: 'File size exceeds 10MB limit' });
            return;
        }

        // Validate file extension
        const file_extension = path.extname(req.file.originalname).toLowerCase();
        if (!is_allowed_extension(file_extension)) {
            res.status(400).json({ message: 'File type not supported. Supported formats: PDF, TXT, DOCX, MD' });
            return;
        }


        // Move file to permanent uploads folder
        const uploads_dir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploads_dir)) {
            fs.mkdirSync(uploads_dir, { recursive: true });
        }

        // Create document file record with pending status
        const document_file = new DocumentFile({
            file_name: req.file.originalname,
            file_size: req.file.size,
            file_type: req.file.mimetype,
            user_id: db_user._id,
            upload_date: new Date(),
            processing_status: 'pending',
            chunk_count: 0
        });

        const saved_document_file = await document_file.save();


        // Send immediate success response
        const response: TUploadResponse = {
            file_id: saved_document_file._id,
            file_name: req.file.originalname,
            file_size: req.file.size,
            file_type: req.file.mimetype,
            user_id: db_user._id.toString(),
            status: 'pending',
            message: 'File uploaded successfully. Processing will begin shortly.'
        };
        res.status(200).json({
            message: 'File uploaded successfully. Processing will begin shortly.',
            data: response
        })

        // Start background processing (don't await)
        process_file_in_background({
            file_path: req.file.path,
            file_id: saved_document_file._id.toString(),
            file_name: req.file.originalname,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            user_id: db_user._id.toString()
        }).catch((error) => {
            console.error('Background processing failed:', error);
        });


        console.log(`File uploaded successfully: ${req.file.originalname} (ID: ${saved_document_file._id}). Background processing started.`);

    } catch (error: unknown) {
        const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('File upload error:', error);

        // Clean up temporary file if it exists
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ message: `File upload failed: ${error_message}` });
    }
};


