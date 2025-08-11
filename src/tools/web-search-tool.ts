import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import { emitToolStatus } from "../utils/event-emitter";
import { ToolStatus } from "../types/shared";

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

type TavilySearchResult = {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
};

export const web_search_tool = tool({
    description: 'Search the web for current information, news, and real-time data',
    parameters: z.object({
        query: z.string().describe('Search query to find information on the web'),
        maxResults: z.number().optional().default(5).describe('Maximum number of search results'),
        includeAnswer: z.boolean().optional().default(true).describe('Include AI-generated answer from search results'),
        searchDepth: z.enum(['basic', 'advanced']).optional().default('advanced').describe('Search depth - basic for quick results, advanced for comprehensive')
    }),

    execute: async ({ query, maxResults = 5, includeAnswer = true, searchDepth = 'advanced' }) => {
        emitToolStatus({ status: { tool: 'web_search', status: ToolStatus.Started } });
        console.log('🔧 TOOL CALLED: webSearch');
        console.log('📋 Parameters:', { query, maxResults, includeAnswer, searchDepth });
        console.log('⏰ Timestamp:', new Date().toISOString());

        try {
            console.log('🌐 Executing web search...');
            const response = await tavilyClient.search(query, {
                maxResults,
                includeAnswer,
                searchDepth: 'advanced',
                includeImages: false,
                includeRawContent: false
            });

            console.log(`✅ Web search successful: Found ${response.results?.length || 0} results`);

            emitToolStatus({ status: { tool: 'web_search', status: ToolStatus.Completed, details: { result_count: response.results?.length || 0 } } });
            return {
                success: true,
                query: query,
                answer: response.answer || '',
                results: response.results?.map((result: TavilySearchResult) => ({
                    title: result.title,
                    url: result.url,
                    content: result.content,
                    score: result.score,
                    publishedDate: result.published_date || null
                })) || [],
                images: response.images || [],
                timestamp: new Date().toISOString(),
                searchDepth: searchDepth
            };

        } catch (error) {
            console.error('❌ Web search error:', error);
            emitToolStatus({ status: { tool: 'web_search', status: ToolStatus.Completed, details: { error: error instanceof Error ? error.message : 'Search failed' } } });
            // Better error handling
            let errorMessage = 'Web search failed';
            if (error instanceof Error) {
                if (error.message.includes('401')) {
                    errorMessage = 'Web search authentication failed - check API key';
                } else if (error.message.includes('429')) {
                    errorMessage = 'Web search rate limit exceeded - try again later';
                } else if (error.message.includes('network')) {
                    errorMessage = 'Network error during web search';
                } else {
                    errorMessage = error.message;
                }
            }

            return {
                success: false,
                error: errorMessage,
                query: query,
                results: [],
                timestamp: new Date().toISOString()
            };
        }
    }
});