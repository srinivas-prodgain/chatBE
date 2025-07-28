import { Document } from 'mongoose';

// Backend-specific conversation type with mongoose Document
export type TConversation = Document & {
    uid: string;
    title: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
};
