import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';

import { mg } from '../config/mg';
import { getEmbedding } from './ai';

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


    async processAndStoreDocument(
        filePath: string,
        fileName: string,
        fileSize: number,
        mimeType: string,
        progressCallback?: (progress: number, message: string) => void
    ): Promise<TProcessedDocument> {

        const fileId = crypto.randomUUID();

        try {
            // Initial setup
            progressCallback?.(5, 'Initializing file processing...');
            await new Promise(resolve => setTimeout(resolve, 100));

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
            await new Promise(resolve => setTimeout(resolve, 200));

            progressCallback?.(25, `Extracting text from ${path.extname(fileName).toUpperCase()} file...`);
            const extractedText = await this.extractTextFromFile(filePath, mimeType);
            console.log("file is there after extracting text", fs.existsSync(filePath))

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text content found in the file');
            }

            progressCallback?.(40, `Extracted ${extractedText.length} characters of text`);
            await new Promise(resolve => setTimeout(resolve, 300));

            // Chunk the text
            progressCallback?.(50, 'Analyzing text structure...');
            await new Promise(resolve => setTimeout(resolve, 200));

            progressCallback?.(60, 'Creating optimized text chunks...');
            const textChunks = this.chunkText(extractedText);
            console.log("file is there after chunking", fs.existsSync(filePath))


            if (textChunks.length === 0) {
                throw new Error('Failed to create text chunks');
            }

            progressCallback?.(70, `Created ${textChunks.length} text chunks for processing`);
            await new Promise(resolve => setTimeout(resolve, 300));

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

            await new Promise(resolve => setTimeout(resolve, 200));

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


    private chunkText(text: string, maxChunkSize: number = 1000, overlapSize: number = 200): string[] {
        // Clean up the text
        const cleanText = text.replace(/\s+/g, ' ').trim();

        if (cleanText.length <= maxChunkSize) {
            return [cleanText];
        }

        const chunks: string[] = [];
        let startIndex = 0;

        while (startIndex < cleanText.length) {
            let endIndex = startIndex + maxChunkSize;

            // If we're not at the end, try to break at a sentence or word boundary
            if (endIndex < cleanText.length) {
                // Look for sentence endings first
                const sentenceEnd = cleanText.lastIndexOf('.', endIndex);
                const questionEnd = cleanText.lastIndexOf('?', endIndex);
                const exclamationEnd = cleanText.lastIndexOf('!', endIndex);

                const bestSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);

                if (bestSentenceEnd > startIndex + maxChunkSize * 0.5) {
                    endIndex = bestSentenceEnd + 1;
                } else {
                    // Fall back to word boundary
                    const wordEnd = cleanText.lastIndexOf(' ', endIndex);
                    if (wordEnd > startIndex + maxChunkSize * 0.5) {
                        endIndex = wordEnd;
                    }
                }
            }

            const chunk = cleanText.slice(startIndex, endIndex).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            // Move start index with overlap
            startIndex = Math.max(startIndex + 1, endIndex - overlapSize);
        }

        return chunks;
    }


    private async storeInMongoDB(chunks: TDocumentChunk[], progressCallback?: (progress: number, message: string) => void): Promise<void> {
        try {
            console.log(`Processing ${chunks.length} chunks with 3 RPM rate limit (20 seconds between requests)`);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];

                // Calculate progress from 85% to 95% (embeddings portion of overall upload)
                const progress = 85 + Math.floor((i / chunks.length) * 10);

                progressCallback?.(progress, `Generating embedding for chunk ${i + 1}/${chunks.length}...`);

                // Generate embedding for this single chunk
                const embedding = await getEmbedding(chunk.content);

                if (!embedding) {
                    throw new Error(`Failed to generate embedding for chunk ${i + 1}`);
                }

                // Create document for MongoDB
                const documentToInsert = {
                    file_id: chunk.metadata.file_id,
                    chunk_id: chunk.id,
                    content: chunk.content,
                    embedding: embedding,
                    metadata: {
                        ...chunk.metadata,
                        upload_date: new Date(chunk.metadata.upload_date)
                    }
                };

                // Insert into MongoDB
                await mg.DocumentEmbedding.create(documentToInsert);

                console.log(`✅ Processed chunk ${i + 1}/${chunks.length}`);

                progressCallback?.(progress + 1, `Saved chunk ${i + 1}/${chunks.length} to database`);

                // Wait 20 seconds between requests (except for the last chunk)
                if (i < chunks.length - 1) {
                    // Show countdown during wait time
                    for (let countdown = 20; countdown > 0; countdown--) {
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

    async searchSimilarDocuments(query: string, maxResults: number = 5): Promise<TSearchResults> {
        try {
            // Generate embedding for the search query
            const queryEmbedding = await getEmbedding(query);

            if (!queryEmbedding) {
                throw new Error('Failed to generate embedding for search query');
            }

            const pipeline = [
                {
                    $vectorSearch: {
                        index: "document_vector_index",
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
                        similarity: { $gt: 0.7 }
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


    async deleteDocument(fileId: string): Promise<void> {
        try {
            // Delete all embeddings for this file
            const deleteResult = await mg.DocumentEmbedding.deleteMany({ file_id: fileId });

            // Delete the document file record
            await mg.DocumentFile.deleteOne({ file_id: fileId });

            console.log(`Deleted ${deleteResult.deletedCount} chunks for file ${fileId}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error deleting document:', error);
            throw new Error(`Failed to delete document: ${errorMessage}`);
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


    async searchInMultipleFiles(fileIds: string[], query: string, maxResults: number = 5): Promise<TSearchResults> {
        try {
            const queryEmbedding = await getEmbedding(query);

            if (!queryEmbedding) {
                throw new Error('Failed to generate embedding for search query');
            }


            const pipeline = [
                {
                    $vectorSearch: {
                        index: "specific_document_vector_search",
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
                        similarity: { $gt: 0.7 }
                    }
                }
            ];

            const results = await mg.DocumentEmbedding.aggregate(pipeline).exec();
            return [results.map((r: { content: string }) => r.content)];
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Error searching in multiple files:', error);
            throw new Error(`Search in files failed: ${errorMessage}`);
        }
    }


}


export const documentEmbeddingsMongoDBService = DocumentEmbeddingsMongoDBService.getInstance();
