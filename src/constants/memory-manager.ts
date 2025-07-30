// Hybrid Memory Manager Configuration Constants

// Token thresholds for summary creation and updates
export const INITIAL_SUMMARY_TRIGGER = 2000; // Tokens to create the first summary
export const SUMMARY_UPDATE_TRIGGER = 1000; // Tokens to update summary after the first

// Message handling configuration  
export const RECENT_MESSAGE_COUNT = 6; // Last N messages to always include (currently using 1)

// Token counting configuration
export const TOKEN_OVERHEAD_PER_MESSAGE = 10; // Overhead for message metadata (role, timestamps, etc.)
export const FALLBACK_CHARS_PER_TOKEN = 4; // Approximate chars per token for fallback calculation

// Summary generation configuration
export const SUMMARY_TEMPERATURE = 0.1; // Temperature for summary generation
export const SUMMARY_MAX_TOKENS = 800; // Maximum tokens for summary generation 
