import fs from 'fs';

import { document_embeddings_mongodb_service } from '../../classes/document-embeddings-mongodb-service';
import { DocumentFile } from '../../models/document-file';
import { TProcessStatus, TResponseRequest } from '../../types/shared';
import { throw_error } from '../../utils/throw-error';




export type TUploadResponse = {
    file_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    user_id: string;
    status: TProcessStatus;
    message: string;
}

export type TProcessFileInBackgroundArgs = {
    file_path: string;
    file_id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    user_id: string;
}





const process_file_in_background = async ({ file_path, file_id, file_name, file_size, mime_type, user_id }: TProcessFileInBackgroundArgs): Promise<void> => {
    try {
        console.log(`Starting background processing for file: ${file_name} (ID: ${file_id})`);

        await DocumentFile.findOneAndUpdate(
            { _id: file_id },
            { processing_status: 'processing' }
        );

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

        await DocumentFile.findOneAndUpdate(
            { _id: file_id },
            {
                processing_status: 'failed',
                error_message: error_message
            }
        );
    } finally {
        if (fs.existsSync(file_path)) {
            fs.unlinkSync(file_path);
            console.log(`Cleaned up temporary file: ${file_path}`);
        }
    }
};

export const handle_upload = async ({ req, res }: TResponseRequest) => {
    if (!req.file) {
        throw_error({ message: 'No file uploaded', status_code: 400 });
        return;
    }

    const user_id = req.user.user_id;



    const document_file = new DocumentFile({
        file_name: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        user_id,
        upload_date: new Date(),
        processing_status: 'pending',
        chunk_count: 0
    });

    const saved_document_file = await document_file.save();


    res.status(200).json({
        message: 'File uploaded successfully. Processing will begin shortly.'
    })

    process_file_in_background({
        file_path: req.file.path,
        file_id: saved_document_file._id.toString(),
        file_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        user_id
    }).catch(error => {
        throw_error({ message: `File upload failed: ${error}`, status_code: 500 });
    });

};


