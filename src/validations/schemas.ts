import { z } from 'zod';

// Message schema for chat
export const MessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1, 'Message content cannot be empty')
});

// Chat request schema
export const ChatRequestSchema = z.object({
    messages: z.array(MessageSchema).min(1, 'At least one message is required'),
    userId: z.string().min(1, 'User ID is required'),
    model: z.enum(['openai', 'mistral', 'gemini']).optional().default('openai'),
});

// Conversation creation schema
export const CreateConversationSchema = z.object({
    uid: z.string().min(1, 'UID is required'),
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    userId: z.string().optional()
});

// Update conversation schema
export const UpdateConversationSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long')
});

// URL parameter schemas
export const UidParamSchema = z.object({
    uid: z.string().min(1, 'UID is required')
});

export const UserIdParamSchema = z.object({
    userId: z.string().min(1, 'User ID is required')
});

export const IdParamSchema = z.object({
    id: z.string().min(24, 'id must be 24 characters long')
});