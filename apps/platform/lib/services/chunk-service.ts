/**
 * ChunkService - Content chunking for REFRAG
 *
 * Handles tokenization and splitting of content into fixed-size chunks
 * for fine-grained retrieval and selective expansion.
 */

import { encode, decode } from 'gpt-tokenizer';
import { RAG_CONFIG } from '../config/rag-config';

export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
}

export interface ChunkingResult {
  chunks: Chunk[];
  totalTokens: number;
  shouldChunk: boolean;
}

export class ChunkService {
  private chunkSize: number;
  private minChunkLength: number;

  constructor(
    chunkSize: number = RAG_CONFIG.REFRAG.CHUNK_SIZE_TOKENS,
    minChunkLength: number = RAG_CONFIG.REFRAG.MIN_CHUNK_LENGTH
  ) {
    this.chunkSize = chunkSize;
    this.minChunkLength = minChunkLength;
  }

  /**
   * Determine if content should be chunked based on length
   */
  shouldChunk(content: string): boolean {
    const tokens = encode(content);
    return tokens.length >= this.minChunkLength;
  }

  /**
   * Chunk content into fixed-size token chunks
   *
   * @param content - The text content to chunk
   * @returns ChunkingResult with chunks and metadata
   */
  chunkContent(content: string): ChunkingResult {
    const tokens = encode(content);
    const totalTokens = tokens.length;

    // If content is too short, don't chunk
    if (totalTokens < this.minChunkLength) {
      return {
        chunks: [{
          index: 0,
          content,
          tokenCount: totalTokens,
        }],
        totalTokens,
        shouldChunk: false,
      };
    }

    const chunks: Chunk[] = [];

    // Split into fixed-size chunks
    for (let i = 0; i < tokens.length; i += this.chunkSize) {
      const chunkTokens = tokens.slice(i, Math.min(i + this.chunkSize, tokens.length));
      const chunkText = this.tokensToText(chunkTokens);

      chunks.push({
        index: Math.floor(i / this.chunkSize),
        content: chunkText,
        tokenCount: chunkTokens.length,
      });
    }

    return {
      chunks,
      totalTokens,
      shouldChunk: true,
    };
  }

  /**
   * Estimate token count for content without full tokenization
   *
   * @param content - The text content
   * @returns Estimated token count
   */
  estimateTokens(content: string): number {
    // Use character-based estimation for performance
    return Math.ceil(content.length / RAG_CONFIG.TOKENS.CHARS_PER_TOKEN);
  }

  /**
   * Get accurate token count using tokenizer
   *
   * @param content - The text content
   * @returns Exact token count
   */
  countTokens(content: string): number {
    return encode(content).length;
  }

  /**
   * Decode tokens back to text
   *
   * @param tokens - Array of token IDs
   * @returns Decoded text
   */
  private tokensToText(tokens: number[]): string {
    return decode(tokens);
  }

  /**
   * Validate chunk size configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.chunkSize <= 0) {
      errors.push(`Chunk size must be positive, got ${this.chunkSize}`);
    }

    if (this.minChunkLength < this.chunkSize) {
      errors.push(
        `Minimum chunk length (${this.minChunkLength}) should be >= chunk size (${this.chunkSize})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Batch chunk multiple pieces of content
   *
   * @param contents - Array of content strings
   * @returns Array of chunking results
   */
  chunkBatch(contents: string[]): ChunkingResult[] {
    return contents.map(content => this.chunkContent(content));
  }

  /**
   * Get chunk statistics
   *
   * @param content - The text content
   * @returns Statistics about how content would be chunked
   */
  getChunkStats(content: string): {
    totalTokens: number;
    estimatedChunks: number;
    shouldChunk: boolean;
    avgTokensPerChunk: number;
  } {
    const totalTokens = this.countTokens(content);
    const shouldChunk = totalTokens >= this.minChunkLength;
    const estimatedChunks = shouldChunk
      ? Math.ceil(totalTokens / this.chunkSize)
      : 1;
    const avgTokensPerChunk = shouldChunk
      ? totalTokens / estimatedChunks
      : totalTokens;

    return {
      totalTokens,
      estimatedChunks,
      shouldChunk,
      avgTokensPerChunk,
    };
  }
}

/**
 * Singleton instance for global use
 */
export const chunkService = new ChunkService();

/**
 * Helper function to chunk content with default settings
 */
export function chunkContent(content: string): ChunkingResult {
  return chunkService.chunkContent(content);
}

/**
 * Helper function to check if content should be chunked
 */
export function shouldChunkContent(content: string): boolean {
  return chunkService.shouldChunk(content);
}
