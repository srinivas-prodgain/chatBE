// Shared types used across frontend and backend



// process status types
export const processStatus = ['pending', 'processing', 'completed', 'failed'] as const;
export type TProcessStatus = (typeof processStatus)[number];




// Model types

export const modelTypes = ['openai', 'mistral', 'gemini'] as const;

export type TModelType = (typeof modelTypes)[number];


// File-related types


export const allowedFileTypes = ['pdf', 'txt', 'docx', 'md'] as const;
export type TAllowedFileTypes = (typeof allowedFileTypes)[number];




export const ALLOWED_FILE_EXTENSIONS: Record<TAllowedFileTypes, string[]> = {
    pdf: ['.pdf'],
    txt: ['.txt'],
    docx: ['.docx'],
    md: ['.md', '.markdown']
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Base message type (includes system role for backend streaming)
export type TBaseMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

// Base conversation type
export type TBaseConversation = {
    _id: string;
    title: string;
    user_id?: string;
    created_at: string;
    updated_at: string;
};

// Streaming chat types
export type TStreamChatRequest = {
    message: string;
    user_id: string;
    model: TModelType;
    selected_file_ids?: string[];
};

export type TStreamChatChunk = {
    content: string;
    conversation_id: string;
};

// API response types
export type TApiSuccess<TData = undefined> = {
    message: string;
    data?: TData;
    pagination?: TPaginationResponse;
};

export type TApiError = {
    message: string;
    status_code: number;
};

export type TApiPromise<TData = undefined> = Promise<TApiSuccess<TData>> | Promise<TApiError>;

// Pagination types
export type TPaginationQParams = {
    page: number;
    limit: number;
};

export type TPaginationResponse = {
    page: number;
    limit: number;
    total_pages: number;
    total_items: number;
};


// Tool status types

export enum ToolStatus {
    Started = 'started',
    Completed = 'completed',
    Error = 'error'
}


export type TToolStatus = {
    tool: string;
    status: 'started' | 'completed';
    details?: {
        result_count?: number;
        error?: string;
    };
};