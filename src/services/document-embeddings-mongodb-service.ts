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
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    chunksCreated: number;
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
    processing_status: 'processing' | 'completed' | 'failed';
}

export class DocumentEmbeddingsMongoDBService {
    private static instance: DocumentEmbeddingsMongoDBService;

    public static getInstance(): DocumentEmbeddingsMongoDBService {
        if (!DocumentEmbeddingsMongoDBService.instance) {
            DocumentEmbeddingsMongoDBService.instance = new DocumentEmbeddingsMongoDBService();
        }
        return DocumentEmbeddingsMongoDBService.instance;
    }


    async processAndStoreDocument({
        filePath,
        fileName,
        fileSize,
        mimeType,
        progressCallback
    }: {
        filePath: string,
        fileName: string,
        fileSize: number,
        mimeType: string,
        progressCallback?: (progress: number, message: string) => void
    }): Promise<TProcessedDocument> {

        const fileId = crypto.randomUUID();

        try {
            // Initial setup
            progressCallback?.(5, 'Initializing file processing...');
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_SHORT));

            // Create document file record
            const documentFile = new mg.DocumentFile({
                file_id: fileId,
                file_name: fileName,
                file_size: fileSize,
                file_type: mimeType,
                upload_date: new Date(),
                processing_status: 'processing'
            });

            await documentFile.save();

            // Extract text from file
            progressCallback?.(10, 'Reading file contents...');
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MEDIUM));

            progressCallback?.(25, `Extracting text from ${path.extname(fileName).toUpperCase()} file...`);
            const extractedText = await this.extractTextFromFile(filePath, mimeType);
            console.log("file is there after extracting text", fs.existsSync(filePath))

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text content found in the file');
            }

            progressCallback?.(40, `Extracted ${extractedText.length} characters of text`);
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_LONG));

            // Chunk the text
            progressCallback?.(50, 'Analyzing text structure...');
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MEDIUM));

            progressCallback?.(60, 'Creating optimized text chunks...');
            const textChunks = this.chunkText(extractedText);
            console.log("file is there after chunking", fs.existsSync(filePath))


            if (textChunks.length === 0) {
                throw new Error('Failed to create text chunks');
            }

            progressCallback?.(70, `Created ${textChunks.length} text chunks for processing`);
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_LONG));

            // Prepare data
            progressCallback?.(75, 'Preparing vector embeddings data...');
            const chunks: TDocumentChunk[] = textChunks.map((chunk, index) => ({
                id: `${fileId}_chunk_${index}`,
                content: chunk,
                metadata: {
                    file_id: fileId,
                    file_name: fileName,
                    file_size: fileSize,
                    file_type: mimeType,
                    chunk_index: index,
                    chunk_count: textChunks.length,
                    upload_date: new Date().toISOString()
                }
            }));

            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MEDIUM));

            // Generate embeddings and store in MongoDB
            progressCallback?.(85, 'Generating vector embeddings with VoyageAI...');
            await this.storeInMongoDB(chunks, progressCallback);
            console.log("file is there after storing in mongodb", fs.existsSync(filePath))

            // Update document file status
            documentFile.processing_status = 'completed';
            documentFile.chunk_count = chunks.length;
            await documentFile.save();

            progressCallback?.(100, `Successfully processed "${fileName}" with ${chunks.length} chunks`);

            return {
                fileId,
                fileName,
                fileSize,
                fileType: mimeType,
                chunksCreated: chunks.length,
                chunks
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error processing document:', error);

            // Update document file status to failed
            try {
                await mg.DocumentFile.findOneAndUpdate(
                    { file_id: fileId },
                    {
                        processing_status: 'failed',
                        error_message: errorMessage
                    }
                );
            } catch (updateError) {
                console.error('Error updating document file status:', updateError);
            }

            progressCallback?.(0, `Error: ${errorMessage}`);
            throw new Error(`Document processing failed: ${errorMessage}`);
        }
    }


    private async extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
        console.log('Extracting text from file:', filePath);

        // Validate file exists before reading
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found at path: ${filePath}`);
        }

        const fileBuffer = fs.readFileSync(filePath);

        switch (mimeType) {
            case 'application/pdf':
                const pdfData = await pdfParse(fileBuffer);
                return pdfData.text;

            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
                return docxData.value;

            case 'text/plain':
                return fileBuffer.toString('utf-8');

            case 'text/markdown':
                const md = new MarkdownIt();
                const markdownText = fileBuffer.toString('utf-8');
                return md.render(markdownText);

            default:
                throw new Error(`Unsupported file type: ${mimeType}`);
        }
    }


    private chunkText(text: string, maxChunkSize: number = DEFAULT_CHUNK_SIZE, overlapSize: number = DEFAULT_OVERLAP_SIZE): string[] {
        const chunks: string[] = [];
        const cleanText = text.replace(/\s+/g, ' ').trim();

        if (cleanText.length <= maxChunkSize) {
            return [cleanText];
        }

        let startIndex = 0;

        while (startIndex < cleanText.length) {
            let endIndex = startIndex + maxChunkSize;

            if (endIndex >= cleanText.length) {
                endIndex = cleanText.length;
            } else {
                // Try to break at sentence boundaries
                const lastSentenceEnd = cleanText.lastIndexOf('.', endIndex);
                const lastExclamation = cleanText.lastIndexOf('!', endIndex);
                const lastQuestion = cleanText.lastIndexOf('?', endIndex);
                const bestSentenceEnd = Math.max(lastSentenceEnd, lastExclamation, lastQuestion);

                if (bestSentenceEnd > startIndex + maxChunkSize * MIN_CHUNK_THRESHOLD) {
                    endIndex = bestSentenceEnd + 1;
                } else {
                    // Fallback to word boundaries
                    const wordEnd = cleanText.lastIndexOf(' ', endIndex);
                    if (wordEnd > startIndex + maxChunkSize * MIN_CHUNK_THRESHOLD) {
                        endIndex = wordEnd;
                    }
                }
            }

            chunks.push(cleanText.substring(startIndex, endIndex).trim());

            // Move to next chunk with overlap
            startIndex = Math.max(startIndex + 1, endIndex - overlapSize);
        }

        return chunks.filter(chunk => chunk.length > 0);
    }


    private async storeInMongoDB(chunks: TDocumentChunk[], progressCallback?: (progress: number, message: string) => void): Promise<void> {
        try {
            console.log(`Processing ${chunks.length} chunks with 3 RPM rate limit (${EMBEDDING_RATE_LIMIT_DELAY} seconds between requests)`);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                // Calculate progress from 85% to 95% (embeddings portion of overall upload)
                const progress = EMBEDDING_PROGRESS_BASE + Math.floor((i / chunks.length) * EMBEDDING_PROGRESS_RANGE);
                progressCallback?.(progress, `Generating embedding for chunk ${i + 1}/${chunks.length}...`);

                // Generate embedding for this single chunk
                const embedding = await get_embedding({ text: chunk.content });

                if (!embedding) {
                    console.warn(`Failed to generate embedding for chunk ${i + 1}/${chunks.length}`);
                    continue;
                }

                // Prepare document to insert
                const documentToInsert = {
                    file_id: chunk.metadata.file_id,
                    chunk_id: chunk.id,
                    content: chunk.content,
                    metadata: chunk.metadata,
                    embedding: embedding
                };

                await mg.DocumentEmbedding.create(documentToInsert);

                // Rate limiting: Wait between requests (except for the last chunk)
                if (i < chunks.length - 1) {
                    // Show countdown during wait time
                    for (let countdown = EMBEDDING_RATE_LIMIT_DELAY; countdown > 0; countdown--) {
                        progressCallback?.(progress, `Rate limit wait: ${countdown}s remaining... (${chunks.length - i - 1} chunks left)`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            console.log(`Successfully stored ${chunks.length} chunks with embeddings in MongoDB`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error storing in MongoDB:', error);
            throw new Error(`Failed to store in database: ${errorMessage}`);
        }
    }

    async searchSimilarDocuments({ query, maxResults = DEFAULT_SEARCH_RESULTS }: { query: string, maxResults?: number }): Promise<TSearchResults> {
        try {
            // Generate embedding for the search query
            const queryEmbedding = await get_embedding({ text: query });

            if (!queryEmbedding) {
                throw new Error('Failed to generate embedding for search query');
            }

            const pipeline = [
                {
                    $vectorSearch: {
                        index: VECTOR_INDEX_NAME,
                        path: "embedding",
                        queryVector: queryEmbedding,
                        numCandidates: maxResults * 10,
                        limit: maxResults
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error searching documents:', error);
            throw new Error(`Search failed: ${errorMessage}`);
        }
    }


    async deleteDocument({ fileId }: { fileId: string }): Promise<void> {
        try {
            // Delete all embeddings for this file
            const deleteResult = await mg.DocumentEmbedding.deleteMany({ file_id: fileId });
            console.log(`Deleted ${deleteResult.deletedCount} embeddings for file ${fileId}`);

            // Delete the file record
            await mg.DocumentFile.deleteOne({ file_id: fileId });
            console.log(`Deleted file record for ${fileId}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error deleting document:', error);
            throw new Error(`Delete failed: ${errorMessage}`);
        }
    }


    async getAllFiles(): Promise<TFileMetadata[]> {
        try {
            const files = await mg.DocumentFile.find({})
                .sort({ upload_date: -1 })
                .lean();

            return files.map(file => ({
                file_id: file.file_id,
                file_name: file.file_name,
                file_size: file.file_size,
                file_type: file.file_type,
                upload_date: file.upload_date.toISOString(),
                chunk_count: file.chunk_count,
                processing_status: file.processing_status
            }));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error getting all files:', error);
            throw new Error(`Failed to get files: ${errorMessage}`);
        }
    }


    async searchInMultipleFiles({ fileIds, query, maxResults = DEFAULT_SEARCH_RESULTS }: { fileIds: string[], query: string, maxResults?: number }): Promise<TSearchResults> {
        try {
            const queryEmbedding = await get_embedding({ text: query });

            if (!queryEmbedding) {
                throw new Error('Failed to generate embedding for search query');
            }

            const pipeline = [
                {
                    $vectorSearch: {
                        index: SPECIFIC_DOCUMENT_INDEX_NAME,
                        path: "embedding",
                        queryVector: queryEmbedding,
                        numCandidates: maxResults * 10,
                        limit: maxResults,
                        filter: {
                            file_id: { $in: fileIds }
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error searching in multiple files:', error);
            throw new Error(`Multi-file search failed: ${errorMessage}`);
        }
    }


}


export const documentEmbeddingsMongoDBService = DocumentEmbeddingsMongoDBService.getInstance();
