import { openai } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';

export const openaiModel = openai('gpt-4o-mini');

export const geminiModel = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://api.google.com/v1',
});

export const mistralModel = createMistral({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1',
});

// For testing fallback: you can temporarily set OPENAI_API_KEY to invalid value
// or use the commented line in chatRoutes.ts to force an error

