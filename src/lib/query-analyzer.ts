import { mistralModel } from '../services/ai';
import { generateObject } from 'ai';
import { z } from 'zod';

export type TQueryAnalysis = {
    needsSearch: boolean;
    reason: string;
    confidence: number;
    optimizedQuery?: string;
}


export const analyzeQuery = async (query: string): Promise<TQueryAnalysis> => {

    try {
        const queryAnalysisSchema = z.object({
            needsSearch: z.boolean().describe('Whether the query requires searching through uploaded documents'),
            reason: z.string().describe('Brief explanation for the decision'),
            confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
            optimizedQuery: z.string().optional().describe('Optimized search query for better semantic search results (only when needsSearch is true)')
        });

        const result = await generateObject({
            model: mistralModel,
            schema: queryAnalysisSchema,
            prompt: `You are a query analyzer. Determine if the user's query needs to search through uploaded documents or if it can be answered conversationally.

SEARCH NEEDED (needsSearch: true) for queries about:
- Specific document content ("What does the contract say...", "According to the file...")
- Document analysis ("Summarize the document", "Find information about...")
- Technical documentation questions
- Specific facts from uploaded files

NO SEARCH NEEDED (needsSearch: false) for:
- Greetings ("Hi", "Hello", "Hey")
- General conversation ("How are you?", "Thank you")
- General knowledge questions that don't reference documents
- Simple requests ("Help me", "Explain AI")

WHEN SEARCH IS NEEDED, generate an optimizedQuery that:
- Focuses on key concepts and keywords for better semantic matching
- Removes filler words and conversational elements
- Uses domain-specific terminology when appropriate
- Is concise but comprehensive

Examples:
- User: "Hey, what does that document say about payment terms?"
  → optimizedQuery: "payment terms conditions deadlines"
  
- User: "Can you find information about the security policies in the uploaded file?"
  → optimizedQuery: "security policies procedures protocols"
  
- User: "I need to know about employee benefits mentioned in the contract"
  → optimizedQuery: "employee benefits compensation healthcare vacation"

User query: "${query}"

Analyze this query and return a structured response with your decision, reasoning, confidence level, and if search is needed, provide an optimized search query.`,
        });

        return result.object;

    } catch (error) {
        console.error('Error analyzing query:', error);
        return {
            needsSearch: true,
            reason: 'Error in analysis, defaulting to search',
            confidence: 0.5
        };
    }
}; 