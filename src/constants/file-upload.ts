// File Upload Configuration Constants

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Upload ID generation
export const UPLOAD_ID_RANDOM_LENGTH = 9; // Length of random string in upload ID

// Conversation title configuration
export const CONVERSATION_TITLE_MAX_LENGTH = 50; // Maximum length for auto-generated conversation titles

// Upload progress percentages
export const UPLOAD_PROGRESS = {
    STARTED: 5,
    SIZE_VALIDATED: 10,
    FORMAT_VALIDATED: 15,
    TEMP_SAVED: 20,
    PROCESSING_STARTED: 25,
    CLEANUP_STARTED: 96,
    COMPLETED: 100
} as const;

// File validation
export const ALLOWED_FILE_EXTENSIONS = {
    DOCUMENTS: ['.pdf', '.txt', '.docx', '.md']
} as const;

// SSE (Server-Sent Events) configuration
export const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
} as const; 