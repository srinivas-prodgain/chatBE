import { z } from 'zod';
import { mg } from '../../config/mg';
import { throw_error } from '../../utils/throw-error';


import { TProcessStatus, TResponseRequest } from '../../types/shared';

export type TFileData = {
    file_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    upload_date: Date;
    processing_status: TProcessStatus;
    chunk_count: number;
    error_message?: string;
}

export const get_file_status = async ({ req, res }: TResponseRequest) => {
    const { file_id } = z_get_file_status_req_params.parse(req.params);


    const document_file = await mg.DocumentFile.findOne({ _id: file_id }).lean();

    if (!document_file) {
        throw_error({ message: "File not found", status_code: 404 });
        return;
    }


    const file_data: TFileData = {
        file_id: document_file._id,
        file_name: document_file.file_name,
        file_size: document_file.file_size,
        file_type: document_file.file_type,
        upload_date: document_file.upload_date,
        processing_status: document_file.processing_status,
        chunk_count: document_file.chunk_count,
        error_message: document_file.error_message,
    }


    res.status(200).json({
        message: "File status retrieved successfully",
        data: file_data
    });
};

const z_get_file_status_req_params = z.object({
    file_id: z.string()
});