import { document_embeddings_mongodb_service } from '../classes/document-embeddings-mongodb-service';
import { analyzeQuery } from '../lib/query-analyzer';
import { MAX_CONTEXT_CHUNKS } from '../constants/document-processing';

export type TDocumentSearchParams = {
    query: string;
    file_ids?: string[];
    intelligent_search_enabled?: boolean;
};

export const document_search_service = {
    async search_relevant_documents({ query, file_ids, intelligent_search_enabled = true }: TDocumentSearchParams): Promise<string> {
        try {
            let search_query = query;

            if (intelligent_search_enabled) {
                console.log('🤔 Analyzing query for document search necessity...');
                const query_analysis = await analyzeQuery({ query });
                console.log(`📊 Analysis result: ${query_analysis.needsSearch ? 'SEARCH NEEDED' : 'NO SEARCH'} - ${query_analysis.reason} (confidence: ${query_analysis.confidence})`);

                if (!query_analysis.needsSearch) {
                    console.log('💬 Skipping document search - responding conversationally');
                    return '';
                }

                if (query_analysis.optimizedQuery) {
                    search_query = query_analysis.optimizedQuery;
                    console.log(`🔍 Using optimized search query: "${query_analysis.optimizedQuery}"`);
                }
            } else {
                console.log('�� Intelligent search disabled - using traditional search');
            }

            if (file_ids && file_ids.length > 0) {
                console.log(`🎯 Searching in ${file_ids.length} selected files with query:`, search_query.substring(0, 100) + '...');
                console.log('📂 Selected file IDs:', file_ids);
            } else {
                console.log('🔍 Searching for relevant documents with query:', search_query.substring(0, 100) + '...');
            }

            const search_results = file_ids && file_ids.length > 0
                ? await document_embeddings_mongodb_service.search_in_multiple_files({ file_ids, query: search_query, max_results: 5 })
                : await document_embeddings_mongodb_service.search_similar_documents({ query: search_query, max_results: 5 });

            if (!search_results || search_results.length === 0) {
                console.log('📄 No relevant documents found - continuing without context');
                return '';
            }

            console.log(`📚 Found ${search_results.length} relevant document chunks`);

            const context_chunks = search_results.flat();
            const filtered_chunks = context_chunks
                .filter((chunk) => chunk && chunk.trim().length > 0)
                .slice(0, MAX_CONTEXT_CHUNKS);

            if (filtered_chunks.length === 0) {
                console.log('📄 No valid document chunks found after filtering');
                return '';
            }

            const context_text = filtered_chunks.join('\n\n---\n\n');
            console.log(`✅ Using ${filtered_chunks.length} document chunks as context (${context_text.length} characters)`);

            return context_text;
        } catch (error: unknown) {
            const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('❌ Error searching documents:', error_message);
            return '';
        }
    }
}; 