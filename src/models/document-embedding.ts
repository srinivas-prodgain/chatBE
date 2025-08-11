import mongoose, { Schema, Document } from 'mongoose';

export type TDocumentEmbedding = Document & {
    _id: string;
    file_id: string;
    chunk_id: string;
    content: string;
    embedding: number[];
    user_id: Schema.Types.ObjectId;
    metadata: {
        file_name: string;
        file_size: number;
        file_type: string;
        chunk_index: number;
        chunk_count: number;
        upload_date: Date;
    };
    created_at: Date;
    updated_at: Date;
}

const documentEmbeddingSchema = new Schema<TDocumentEmbedding>({
    file_id: {
        type: String,
        required: true,
        index: true
    },
    chunk_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        text: true // Enable text search
    },
    embedding: {
        type: [Number],
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    metadata: {
        file_name: {
            type: String,
            required: true
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
        chunk_index: {
            type: Number,
            required: true
        },
        chunk_count: {
            type: Number,
            required: true
        },
        upload_date: {
            type: Date,
            required: true,
            index: true
        }
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Create compound indexes for efficient queries
documentEmbeddingSchema.index({ file_id: 1, 'metadata.chunk_index': 1 });
documentEmbeddingSchema.index({ 'metadata.file_type': 1, 'metadata.upload_date': -1 });
documentEmbeddingSchema.index({ 'metadata.upload_date': -1 });

export const DocumentEmbedding = mongoose.model<TDocumentEmbedding>('DocumentEmbedding', documentEmbeddingSchema); 
