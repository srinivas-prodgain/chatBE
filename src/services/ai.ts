import { openai } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { VoyageAIClient } from 'voyageai';

export const openai_model = openai('gpt-4o-mini');

export const gemini_model = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://api.google.com/v1',
});

const mistral = createMistral({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1',
});

export const mistral_model = mistral('mistral-large-latest');

type TGetEmbeddingArgs = {
    text: string;
};

const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });

export const get_embedding = async ({ text }: TGetEmbeddingArgs): Promise<number[] | undefined> => {
    const results = await client.embed({
        input: text,
        model: "voyage-3-large",
        outputDimension: 1024
    });
    return results?.data?.[0]?.embedding;
};

