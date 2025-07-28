// Shared types used across frontend and backend

// File-related types
export type TAllowedFileTypes = 'pdf' | 'txt' | 'docx' | 'md';

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
    uid: string;
    title: string;
    userId?: string;
    createdAt: string;
    updatedAt: string;
};

// Streaming chat types
export type TStreamChatRequest = {
    message: string;
    userId: string;
    model: string;
    selectedFileIds?: string[];
};

export type TStreamChatChunk = {
    content: string;
    conversationId: string;
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