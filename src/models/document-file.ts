import mongoose, { Schema, Document } from 'mongoose';

const processing_status = ['processing', 'completed', 'failed', 'pending'] as const;
type TProcessingStatus = (typeof processing_status)[number];

export type TDocumentFile = Document & {
    _id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    upload_date: Date;
    chunk_count: number;
    user_id: Schema.Types.ObjectId;
    processing_status: TProcessingStatus;
    error_message?: string;
    created_at: Date;
    updated_at: Date;
}

const documentFileSchema = new Schema<TDocumentFile>({
    file_name: {
        type: String,
        required: true,
        index: true
    },
    file_size: {
        type: Number,
        required: true
    },
    file_type: {
        type: String,
        required: true,
        index: true
    },
    upload_date: {
        type: Date,
        required: true,
        index: true
    },
    chunk_count: {
        type: Number,
        required: true,
        default: 0
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    processing_status: {
        type: String,
        enum: processing_status,
        default: 'pending',
        index: true
    },
    error_message: {
        type: String
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

documentFileSchema.index({ upload_date: -1 });
documentFileSchema.index({ file_type: 1, upload_date: -1 });
documentFileSchema.index({ processing_status: 1, upload_date: -1 });

export const DocumentFile = mongoose.model<TDocumentFile>('DocumentFile', documentFileSchema); 
