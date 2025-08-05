// File Upload Configuration Constants

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Conversation title configuration
export const CONVERSATION_TITLE_MAX_LENGTH = 50; // Maximum length for auto-generated conversation titles

// File validation
export const ALLOWED_FILE_EXTENSIONS = {
    DOCUMENTS: ['.pdf', '.txt', '.docx', '.md']
} as const; 