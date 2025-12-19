/**
 * REFRAG Memory Service
 *
 * Implements REFRAG (Retrieval with Feedback and Reasoning for Adaptive Generation):
 * - Searches using fine-grained chunks
 * - Applies SENSE mechanism: expands top N%, compresses rest
 * - Optimizes token usage while maintaining context quality
 */

import { prisma } from '@governs-ai/db';
import { UniversalEmbeddingService } from './embedding-service';
import { RAG_CONFIG, getDatabaseVectorDimension } from '../config/rag-config';

export interface ScoredChunk {
  chunk: {
    id: string;
    contextMemoryId: string;
    chunkIndex: number;
    content: string;
    tokenCount: number;
    embedding: number[];
    createdAt: Date;
  };
  score: number;
  contextMemory: {
    id: string;
    content: string;
    timestamp: Date;
    role: string;
    agentId: string | null;
    conversationId: string | null;
  };
}

export interface RefragRetrievalParams {
  userId: string;
  orgId?: string;
  query: string;
  conversationId?: string;
  agentId?: string;
  limit?: number;
  compressionRatio?: number;
  minSimilarity?: number;
  includeTiers?: string[]; // Default: ['hot', 'warm']
}

export interface RefragRetrievalResult {
  expanded: ScoredChunk[];
  compressed: Array<{
    embedding: number[];
    score: number;
    contextMemoryId: string;
  }>;
  totalChunks: number;
  tokenSavings: number;
  tokenSavingsPercent: number;
  originalTokens: number;
  expandedTokens: number;
}

export class RefragMemoryService {
  private embeddingService: UniversalEmbeddingService;
  private compressionRatio: number;

  constructor(compressionRatio: number = RAG_CONFIG.REFRAG.COMPRESSION_RATIO) {
    this.embeddingService = new UniversalEmbeddingService({
      provider: RAG_CONFIG.EMBEDDING.DEFAULT_PROVIDER,
    });
    this.compressionRatio = compressionRatio;
  }

  /**
   * REFRAG retrieval: Score chunks, expand top chunks, compress rest
   *
   * @param params - Retrieval parameters
   * @returns REFRAG retrieval result with expanded and compressed chunks
   */
  async retrieve(params: RefragRetrievalParams): Promise<RefragRetrievalResult> {
    const {
      userId,
      orgId,
      query,
      conversationId,
      agentId,
      limit = 50,
      compressionRatio = this.compressionRatio,
      minSimilarity = RAG_CONFIG.SIMILARITY.MIN_THRESHOLD,
      includeTiers = ['hot', 'warm'], // Only search recent tiers by default
    } = params;

    // 1. Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // 2. Search for relevant chunks using vector similarity
    const rawChunks = await this.searchChunks({
      userId,
      orgId,
      conversationId,
      agentId,
      queryEmbedding,
      limit,
      minSimilarity,
      includeTiers,
    });

    if (rawChunks.length === 0) {
      return {
        expanded: [],
        compressed: [],
        totalChunks: 0,
        tokenSavings: 0,
        tokenSavingsPercent: 0,
        originalTokens: 0,
        expandedTokens: 0,
      };
    }

    // 3. SENSE: Determine which chunks to expand (top 1-compressionRatio)
    const numExpand = Math.ceil(rawChunks.length * (1 - compressionRatio));
    const numCompress = rawChunks.length - numExpand;

    // 4. Separate expanded vs compressed
    const expanded: ScoredChunk[] = rawChunks.slice(0, numExpand);
    const compressed = rawChunks.slice(numExpand).map(chunk => ({
      embedding: chunk.chunk.embedding,
      score: chunk.score,
      contextMemoryId: chunk.contextMemory.id,
    }));

    // 5. Calculate token savings
    const originalTokens = rawChunks.reduce((sum, c) => sum + c.chunk.tokenCount, 0);
    const expandedTokens = expanded.reduce((sum, c) => sum + c.chunk.tokenCount, 0);
    const tokenSavings = originalTokens - expandedTokens;
    const tokenSavingsPercent = originalTokens > 0
      ? (tokenSavings / originalTokens) * 100
      : 0;

    console.log(
      `🔍 REFRAG: Retrieved ${rawChunks.length} chunks, ` +
      `expanded ${numExpand}, compressed ${numCompress}, ` +
      `saved ${Math.round(tokenSavingsPercent)}% tokens`
    );

    return {
      expanded,
      compressed,
      totalChunks: rawChunks.length,
      tokenSavings,
      tokenSavingsPercent: Math.round(tokenSavingsPercent),
      originalTokens,
      expandedTokens,
    };
  }

  /**
   * Search chunks using pgvector similarity
   *
   * @param params - Search parameters
   * @returns Array of scored chunks
   */
  private async searchChunks(params: {
    userId: string;
    orgId?: string;
    conversationId?: string;
    agentId?: string;
    queryEmbedding: number[];
    limit: number;
    minSimilarity: number;
    includeTiers?: string[];
  }): Promise<ScoredChunk[]> {
    const {
      userId,
      orgId,
      conversationId,
      agentId,
      queryEmbedding,
      limit,
      minSimilarity,
      includeTiers = ['hot', 'warm'],
    } = params;

    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    const vectorDim = getDatabaseVectorDimension();

    // Build WHERE clause conditions
    const conditions: string[] = ['cm.user_id = $2'];
    const sqlParams: any[] = [embeddingStr, userId];
    let paramIndex = 3;

    if (orgId) {
      conditions.push(`cm.org_id = $${paramIndex}`);
      sqlParams.push(orgId);
      paramIndex++;
    }

    if (conversationId) {
      conditions.push(`cm.conversation_id = $${paramIndex}`);
      sqlParams.push(conversationId);
      paramIndex++;
    }

    if (agentId) {
      conditions.push(`cm.agent_id = $${paramIndex}`);
      sqlParams.push(agentId);
      paramIndex++;
    }

    // Add minimum similarity filter
    conditions.push(`cc.embedding IS NOT NULL`);
    conditions.push(`cm.chunks_computed = true`);

    // Filter by retention tier (only search hot/warm by default)
    const tierPlaceholders = includeTiers.map((_, i) => `$${paramIndex + i}`).join(', ');
    conditions.push(`cm.retention IN (${tierPlaceholders})`);
    sqlParams.push(...includeTiers);
    paramIndex += includeTiers.length;

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT
        cc.id,
        cc.context_memory_id,
        cc.chunk_index,
        cc.content,
        cc.token_count,
        cc.embedding,
        cc.created_at,
        cm.id as context_memory_id,
        cm.content as full_content,
        cm.created_at as timestamp,
        cm.content_type as role,
        cm.agent_id,
        cm.conversation_id,
        1 - (cc.embedding <=> $1::vector(${vectorDim})) as similarity_score
      FROM context_chunks cc
      JOIN context_memory cm ON cc.context_memory_id = cm.id
      WHERE ${whereClause}
        AND (1 - (cc.embedding <=> $1::vector(${vectorDim}))) >= ${minSimilarity}
      ORDER BY cc.embedding <=> $1::vector(${vectorDim}) ASC
      LIMIT ${limit}
    `;

    const results = await prisma.$queryRawUnsafe<any[]>(query, ...sqlParams);

    return results.map(row => ({
      chunk: {
        id: row.id,
        contextMemoryId: row.context_memory_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        tokenCount: row.token_count,
        embedding: row.embedding,
        createdAt: row.created_at,
      },
      score: parseFloat(row.similarity_score),
      contextMemory: {
        id: row.context_memory_id,
        content: row.full_content,
        timestamp: row.timestamp,
        role: row.role,
        agentId: row.agent_id,
        conversationId: row.conversation_id,
      },
    }));
  }

  /**
   * Format expanded chunks for LLM consumption
   *
   * Groups chunks by context memory and formats them coherently
   *
   * @param chunks - Array of scored chunks
   * @param maxTokens - Maximum token budget
   * @returns Formatted context string
   */
  formatForLLM(chunks: ScoredChunk[], maxTokens: number = RAG_CONFIG.TOKENS.DEFAULT_BUDGET): string {
    if (chunks.length === 0) {
      return '';
    }

    // Group chunks by context memory for coherent reconstruction
    const grouped = this.groupByContextMemory(chunks);

    let context = '';
    let usedTokens = 0;

    for (const [contextId, groupedChunks] of grouped.entries()) {
      // Sort chunks by index to maintain order
      const sortedChunks = groupedChunks.sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);

      // Reconstruct content from chunks
      const reconstructedContent = sortedChunks
        .map(c => c.chunk.content)
        .join(' ');

      const chunkTokens = sortedChunks.reduce((sum, c) => sum + c.chunk.tokenCount, 0);

      // Check if we have budget
      if (usedTokens + chunkTokens > maxTokens) {
        break;
      }

      // Format with metadata for LLM context
      const avgScore = sortedChunks.reduce((sum, c) => sum + c.score, 0) / sortedChunks.length;
      const timestamp = sortedChunks[0].contextMemory.timestamp;
      const timeAgo = this.formatTimeAgo(timestamp);

      context += `[Context from ${timeAgo}, relevance: ${(avgScore * 100).toFixed(0)}%]\n`;
      context += `${reconstructedContent}\n\n`;

      usedTokens += chunkTokens;
    }

    return context.trim();
  }

  /**
   * Group chunks by their parent context memory
   */
  private groupByContextMemory(chunks: ScoredChunk[]): Map<string, ScoredChunk[]> {
    const grouped = new Map<string, ScoredChunk[]>();

    for (const chunk of chunks) {
      const id = chunk.contextMemory.id;
      if (!grouped.has(id)) {
        grouped.set(id, []);
      }
      grouped.get(id)!.push(chunk);
    }

    return grouped;
  }

  /**
   * Format timestamp as human-readable time ago
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  }

  /**
   * Get retrieval statistics for a user
   */
  async getStats(userId: string, days: number = 7): Promise<{
    totalChunks: number;
    avgTokenSavings: number;
    avgExpandedChunks: number;
    avgCompressedChunks: number;
  }> {
    // This would query from RefragAnalytics table (to be implemented)
    // For now, return placeholder
    return {
      totalChunks: 0,
      avgTokenSavings: 0,
      avgExpandedChunks: 0,
      avgCompressedChunks: 0,
    };
  }
}

/**
 * Singleton instance for global use
 */
export const refragMemoryService = new RefragMemoryService();

/**
 * Helper function to retrieve with REFRAG
 */
export async function retrieveWithRefrag(params: RefragRetrievalParams): Promise<RefragRetrievalResult> {
  return refragMemoryService.retrieve(params);
}
