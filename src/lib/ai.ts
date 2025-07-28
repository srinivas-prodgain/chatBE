import { openai } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { VoyageAIClient } from 'voyageai';

export const openaiModel = openai('gpt-4o-mini');

export const geminiModel = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://api.google.com/v1',
});

const mistral = createMistral({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1',
});

export const mistralModel = mistral('mistral-large-latest');

// Set up Voyage AI configuration
const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });

// Function to generate embeddings using the Voyage AI API
export async function getEmbedding(text: string) {
    const results = await client.embed({
        input: text,
        model: "voyage-3-large",
        outputDimension: 1024  // Match existing MongoDB vector index
    });
    return results?.data?.[0]?.embedding;
}

// For testing fallback: you can temporarily set OPENAI_API_KEY to invalid value
// or use the commented line in chatRoutes.ts to force an error

