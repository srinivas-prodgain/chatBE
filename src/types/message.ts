import mongoose, { Document } from 'mongoose';

// Backend-specific message type with mongoose Document
export type TMessage = Document & {
    message: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    conversationId: mongoose.Types.ObjectId;
};