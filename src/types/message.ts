import { Document, Schema } from 'mongoose';

const allowedRoles = ['user', 'ai'] as const;
export type TAllowedRoles = (typeof allowedRoles)[number];


export type TMessage = Document & {
    message: string;
    sender: TAllowedRoles;
    conversation_id: Schema.Types.ObjectId;
    user_id: Schema.Types.ObjectId;
    created_at: Date;
    updated_at: Date;
};