import { Document, Types } from 'mongoose';

export type TConversation = Document<unknown, any, any> & {
    uid: string;
    title: string;
    user_id?: string;
    summary?: string;
    created_at: Date;
    last_summarized_message_index: number;
    last_token_count: number;
    summary_version: number;
    updated_at: Date;
} & {
    _id: Types.ObjectId;
};
