// Document Processing Configuration Constants

// Text chunking configuration
export const DEFAULT_CHUNK_SIZE = 1000; // Default maximum chunk size
export const DEFAULT_OVERLAP_SIZE = 200; // Default overlap between chunks
export const MIN_CHUNK_THRESHOLD = 0.5; // Minimum threshold for sentence/word boundaries

// Embedding processing configuration
export const EMBEDDING_RATE_LIMIT_DELAY = 20; // Seconds between embedding requests (rate limiting)
export const EMBEDDING_PROGRESS_BASE = 85; // Base progress percentage for embedding generation
export const EMBEDDING_PROGRESS_RANGE = 10; // Progress range for embedding generation

// Search configuration
export const DEFAULT_SEARCH_RESULTS = 5; // Default number of search results
export const SEARCH_SIMILARITY_THRESHOLD = 0.7; // Minimum similarity score for search results
export const MAX_CONTEXT_CHUNKS = 5; // Maximum number of context chunks to include

// Vector search index configuration
export const VECTOR_INDEX_NAME = "document_vector_index";
export const SPECIFIC_DOCUMENT_INDEX_NAME = "specific_document_vector_search";
export const VECTOR_DIMENSION = 1024; // Vector dimension for embeddings

// File processing timeouts and delays
export const PROCESSING_DELAY_SHORT = 100; // ms
export const PROCESSING_DELAY_MEDIUM = 200; // ms  
export const PROCESSING_DELAY_LONG = 300; // ms 