import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';

import { mg } from '../config/mg';
import { get_embedding } from './ai';
import {
    DEFAULT_CHUNK_SIZE,
    DEFAULT_OVERLAP_SIZE,
    MIN_CHUNK_THRESHOLD,
    EMBEDDING_RATE_LIMIT_DELAY,
    EMBEDDING_PROGRESS_BASE,
    EMBEDDING_PROGRESS_RANGE,
    DEFAULT_SEARCH_RESULTS,
    SEARCH_SIMILARITY_THRESHOLD,
    VECTOR_INDEX_NAME,
    SPECIFIC_DOCUMENT_INDEX_NAME,
    VECTOR_DIMENSION,
    PROCESSING_DELAY_SHORT,
    PROCESSING_DELAY_MEDIUM,
    PROCESSING_DELAY_LONG
} from '../constants/document-processing';
import { TProcessStatus } from '@/types/shared';

export type TDocumentMetadata = {
    file_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    chunk_index: number;
    chunk_count: number;
    upload_date: string;
};

export type TDocumentChunk = {
    id: string;
    content: string;
    metadata: TDocumentMetadata;
}

export type TProcessedDocument = {
    file_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    chunks_created: number;
    chunks: TDocumentChunk[];
}

// New types for search results
export type TSearchResult = {
    content: string;
    metadata: TDocumentMetadata;
    similarity: number;
}

export type TSearchResults = string[][];

export type TFileMetadata = {
    file_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    upload_date: string;
    chunk_count: number;
    processing_status: TProcessStatus;
}

// Function argument types
type TProcessAndStoreDocumentArgs = {
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    file_id: string;
    progress_callback?: (progress: number, message: string) => void;
};

type TExtractTextFromFileArgs = {
    file_path: string;
    mime_type: string;
};

type TChunkTextArgs = {
    text: string;
    max_chunk_size?: number;
    overlap_size?: number;
};

type TFindLastSentenceEndArgs = {
    text: string;
    start: number;
    end: number;
};

type TStoreInMongodbArgs = {
    chunks: TDocumentChunk[];
    progress_callback?: (progress: number, message: string) => void;
};

type TSearchSimilarDocumentsArgs = {
    query: string;
    max_results?: number;
};

type TDeleteDocumentArgs = {
    file_id: string;
};

type TSearchInMultipleFilesArgs = {
    file_ids: string[];
    query: string;
    max_results?: number;
};

export class DocumentEmbeddingsMongoDBService {
    private static instance: DocumentEmbeddingsMongoDBService;

    public static get_instance(): DocumentEmbeddingsMongoDBService {
        if (!DocumentEmbeddingsMongoDBService.instance) {
            DocumentEmbeddingsMongoDBService.instance = new DocumentEmbeddingsMongoDBService();
        }
        return DocumentEmbeddingsMongoDBService.instance;
    }

    async process_and_store_document({
        file_path,
        file_name,
        file_size,
        mime_type,
        file_id,
        progress_callback
    }: TProcessAndStoreDocumentArgs): Promise<TProcessedDocument> {


        try {
            // Initial setup
            progress_callback?.(5, 'Initializing file processing...');
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_SHORT));

            // Get or create document file record
            let document_file = await mg.DocumentFile.findOne({ _id: file_id });

            if (!document_file) {
                throw new Error('Document file not found');
            } else {
                document_file.processing_status = 'processing';
                await document_file.save();
            }

            // Extract text from file
            progress_callback?.(10, 'Reading file contents...');
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MEDIUM));

            progress_callback?.(25, `Extracting text from ${path.extname(file_name).toUpperCase()} file...`);
            const extracted_text = await this.extract_text_from_file({ file_path, mime_type });
            console.log("file is there after extracting text", fs.existsSync(file_path))

            if (!extracted_text || extracted_text.trim().length === 0) {
                throw new Error('The file appears to be empty or contains no readable text. Please ensure the file has content and try uploading again.');
            }

            progress_callback?.(40, `Extracted ${extracted_text.length} characters of text`);
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_LONG));

            // Chunk the text
            progress_callback?.(50, 'Analyzing text structure...');
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MEDIUM));

            progress_callback?.(60, 'Creating optimized text chunks...');
            const text_chunks = this.chunk_text({ text: extracted_text });
            console.log("text_chunks", text_chunks);
            console.log("file is there after chunking", fs.existsSync(file_path))

            if (text_chunks.length === 0) {
                throw new Error('Failed to create text chunks');
            }

            progress_callback?.(70, `Created ${text_chunks.length} text chunks for processing`);
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_LONG));

            // Prepare data
            progress_callback?.(75, 'Preparing vector embeddings data...');
            const chunks: TDocumentChunk[] = text_chunks.map((chunk, index) => ({
                id: `${file_id}_chunk_${index}`,
                content: chunk,
                metadata: {
                    file_id: file_id,
                    file_name: file_name,
                    file_size: file_size,
                    file_type: mime_type,
                    chunk_index: index,
                    chunk_count: text_chunks.length,
                    upload_date: new Date().toISOString()
                }
            }));

            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MEDIUM));

            // Generate embeddings and store in MongoDB
            progress_callback?.(85, 'Generating vector embeddings with VoyageAI...');
            await this.store_in_mongodb({ chunks, progress_callback });
            console.log("file is there after storing in mongodb", fs.existsSync(file_path))

            // Update document file status
            document_file.processing_status = 'completed';
            document_file.chunk_count = chunks.length;
            await document_file.save();

            progress_callback?.(100, `Successfully processed "${file_name}" with ${chunks.length} chunks`);

            return {
                file_id: file_id,
                file_name,
                file_size,
                file_type: mime_type,
                chunks_created: chunks.length,
                chunks
            };

        } catch (error: unknown) {
            const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error processing document:', error);

            // Update document file status to failed
            try {
                await mg.DocumentFile.findOneAndUpdate(
                    { _id: file_id },
                    {
                        processing_status: 'failed',
                        error_message: error_message
                    }
                );
            } catch (update_error) {
                console.error('Error updating document file status:', update_error);
            }

            progress_callback?.(0, `Error: ${error_message}`);
            throw new Error(`Document processing failed: ${error_message}`);
        }
    }

    private async extract_text_from_file({ file_path, mime_type }: TExtractTextFromFileArgs): Promise<string> {
        console.log('Extracting text from file:', file_path);

        // Validate file exists before reading
        if (!fs.existsSync(file_path)) {
            throw new Error(`File not found at path: ${file_path}`);
        }

        const file_buffer = fs.readFileSync(file_path);

        switch (mime_type) {
            case 'application/pdf':
                const pdf_data = await pdfParse(file_buffer);
                return pdf_data.text;

            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docx_data = await mammoth.extractRawText({ buffer: file_buffer });
                return docx_data.value;

            case 'text/plain':
                return file_buffer.toString('utf-8');

            case 'text/markdown':
                const md = new MarkdownIt();
                const markdown_text = file_buffer.toString('utf-8');
                return md.render(markdown_text);

            default:
                throw new Error(`Unsupported file type: ${mime_type}`);
        }
    }

    private chunk_text({ text, max_chunk_size = DEFAULT_CHUNK_SIZE, overlap_size = DEFAULT_OVERLAP_SIZE }: TChunkTextArgs): string[] {
        const chunks: string[] = [];
        const clean_text = text.replace(/\s+/g, ' ').trim();

        if (clean_text.length <= max_chunk_size) {
            return [clean_text];
        }

        let start_index = 0;

        while (start_index < clean_text.length) {
            let end_index = start_index + max_chunk_size;

            // If we're at the end of the text, take everything
            if (end_index >= clean_text.length) {
                end_index = clean_text.length;
            } else {
                // Try to break at sentence boundaries first
                const search_start = Math.max(start_index, end_index - Math.floor(max_chunk_size * 0.3)); // Search in last 30% of chunk
                const last_sentence_end = this.findLastSentenceEnd({ text: clean_text, start: search_start, end: end_index });

                if (last_sentence_end > start_index) {
                    end_index = last_sentence_end + 1;
                } else {
                    // Fallback to word boundaries
                    const word_end = clean_text.lastIndexOf(' ', end_index);
                    if (word_end > start_index + Math.floor(max_chunk_size * 0.1)) { // Ensure minimum chunk size
                        end_index = word_end;
                    }
                    // If no good word boundary found, keep the original end_index
                }
            }

            const chunk = clean_text.substring(start_index, end_index).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            // Move to next chunk - ensure we always make progress
            if (end_index >= clean_text.length) {
                break; // We're done
            }

            // Calculate next start position with overlap
            const next_start = Math.max(
                start_index + Math.floor(max_chunk_size * 0.5), // Ensure minimum progress (50% of chunk size)
                end_index - overlap_size
            );

            // Safety check: ensure we're making progress
            if (next_start <= start_index) {
                start_index = start_index + Math.floor(max_chunk_size * 0.5);
            } else {
                start_index = next_start;
            }
        }

        return chunks.filter(chunk => chunk.length > 0);
    }

    // Helper method to find sentence endings more accurately
    private findLastSentenceEnd({ text, start, end }: TFindLastSentenceEndArgs): number {
        const sentence_endings = ['.', '!', '?'];
        let last_pos = -1;

        for (let i = end - 1; i >= start; i--) {
            if (sentence_endings.includes(text[i])) {
                // Check if it's likely a real sentence ending (not an abbreviation)
                const next_char = text[i + 1];
                if (!next_char || next_char === ' ' || next_char === '\n') {
                    // Additional check: avoid common abbreviations
                    const preceding_text = text.substring(Math.max(0, i - 10), i).toLowerCase();
                    const common_abbrevs = ['dr.', 'mr.', 'mrs.', 'ms.', 'inc.', 'ltd.', 'etc.', 'vs.', 'e.g.', 'i.e.'];

                    const is_abbreviation = common_abbrevs.some(abbrev =>
                        preceding_text.endsWith(abbrev.slice(0, -1))
                    );

                    if (!is_abbreviation) {
                        last_pos = i;
                        break;
                    }
                }
            }
        }

        return last_pos;
    }

    private async store_in_mongodb({ chunks, progress_callback }: TStoreInMongodbArgs): Promise<void> {
        try {
            console.log(`Processing ${chunks.length} chunks with 3 RPM rate limit (${EMBEDDING_RATE_LIMIT_DELAY} seconds between requests)`);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                // Calculate progress from 85% to 95% (embeddings portion of overall upload)
                const progress = EMBEDDING_PROGRESS_BASE + Math.floor((i / chunks.length) * EMBEDDING_PROGRESS_RANGE);
                progress_callback?.(progress, `Generating embedding for chunk ${i + 1}/${chunks.length}...`);

                // Generate embedding for this single chunk
                const embedding = await get_embedding({ text: chunk.content });

                if (!embedding) {
                    console.warn(`Failed to generate embedding for chunk ${i + 1}/${chunks.length}`);
                    continue;
                }

                // Prepare document to insert
                const document_to_insert = {
                    file_id: chunk.metadata.file_id,
                    chunk_id: chunk.id,
                    content: chunk.content,
                    metadata: chunk.metadata,
                    embedding: embedding
                };

                await mg.DocumentEmbedding.create(document_to_insert);

                // Rate limiting: Wait between requests (except for the last chunk)
                if (i < chunks.length - 1) {
                    // Show countdown during wait time
                    for (let countdown = EMBEDDING_RATE_LIMIT_DELAY; countdown > 0; countdown--) {
                        progress_callback?.(progress, `Rate limit wait: ${countdown}s remaining... (${chunks.length - i - 1} chunks left)`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            console.log(`Successfully stored ${chunks.length} chunks with embeddings in MongoDB`);
        } catch (error: unknown) {
            const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error storing in MongoDB:', error);
            throw new Error(`Failed to store in database: ${error_message}`);
        }
    }

    async search_similar_documents({ query, max_results = DEFAULT_SEARCH_RESULTS }: TSearchSimilarDocumentsArgs): Promise<TSearchResults> {
        try {
            // Generate embedding for the search query
            const query_embedding = await get_embedding({ text: query });

            if (!query_embedding) {
                throw new Error('Failed to generate embedding for search query');
            }

            const pipeline = [
                {
                    $vectorSearch: {
                        index: VECTOR_INDEX_NAME,
                        path: "embedding",
                        queryVector: query_embedding,
                        numCandidates: max_results * 10,
                        limit: max_results
                    }
                },
                {
                    $project: {
                        content: 1,
                        metadata: 1,
                        similarity: { $meta: "vectorSearchScore" } // Get the similarity score
                    }
                },
                {
                    $match: {
                        similarity: { $gt: SEARCH_SIMILARITY_THRESHOLD }
                    }
                }
            ];

            // Execute the aggregation pipeline
            const results = await mg.DocumentEmbedding.aggregate(pipeline).exec();


            // console.log('Results:', results);

            // Format results to match expected usage pattern (array of string arrays)
            return [results.map((r: { content: string }) => r.content)];

        } catch (error: unknown) {
            const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error searching documents:', error);
            throw new Error(`Search failed: ${error_message}`);
        }
    }

    async delete_document({ file_id }: TDeleteDocumentArgs): Promise<void> {
        try {
            // Delete all embeddings for this file
            const delete_result = await mg.DocumentEmbedding.deleteMany({ file_id: file_id });
            console.log(`Deleted ${delete_result.deletedCount} embeddings for file ${file_id}`);

            // Delete the file record
            await mg.DocumentFile.deleteOne({ _id: file_id });
            console.log(`Deleted file record for ${file_id}`);
        } catch (error: unknown) {
            const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error deleting document:', error);
            throw new Error(`Delete failed: ${error_message}`);
        }
    }

    async get_all_files(): Promise<TFileMetadata[]> {
        try {
            const files = await mg.DocumentFile.find({})
                .sort({ upload_date: -1 })
                .lean();

            return files.map(file => ({
                file_id: file._id,
                file_name: file.file_name,
                file_size: file.file_size,
                file_type: file.file_type,
                upload_date: file.upload_date.toISOString(),
                chunk_count: file.chunk_count,
                processing_status: file.processing_status
            }));
        } catch (error: unknown) {
            const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error getting all files:', error);
            throw new Error(`Failed to get files: ${error_message}`);
        }
    }

    async search_in_multiple_files({ file_ids, query, max_results = DEFAULT_SEARCH_RESULTS }: TSearchInMultipleFilesArgs): Promise<TSearchResults> {
        try {
            const query_embedding = await get_embedding({ text: query });

            if (!query_embedding) {
                throw new Error('Failed to generate embedding for search query');
            }

            const pipeline = [
                {
                    $vectorSearch: {
                        index: SPECIFIC_DOCUMENT_INDEX_NAME,
                        path: "embedding",
                        queryVector: query_embedding,
                        numCandidates: max_results * 10,
                        limit: max_results,
                        filter: {
                            file_id: { $in: file_ids }
                        }
                    }
                },
                {
                    $project: {
                        content: 1,
                        metadata: 1,
                        similarity: { $meta: "vectorSearchScore" }
                    }
                },
                {
                    $match: {
                        similarity: { $gt: SEARCH_SIMILARITY_THRESHOLD }
                    }
                }
            ];

            const results = await mg.DocumentEmbedding.aggregate(pipeline).exec();

            return [results.map((r: { content: string }) => r.content)];

        } catch (error: unknown) {
            const error_message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error searching in multiple files:', error);
            throw new Error(`Multi-file search failed: ${error_message}`);
        }
    }
}

export const document_embeddings_mongodb_service = DocumentEmbeddingsMongoDBService.get_instance();
