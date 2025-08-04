import { Document, Schema } from 'mongoose';

export type TMessage = Document & {
    message: string;
    sender: 'user' | 'ai';
    conversation_id: Schema.Types.ObjectId;
    created_at: Date;
    updated_at: Date;
};