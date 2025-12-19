/**
 * Centralized RAG Configuration
 *
 * All constants and settings for RAG and REFRAG implementation
 */

export const RAG_CONFIG = {
  // === Embedding Configuration ===
  EMBEDDING: {
    // Default provider (openai, ollama, huggingface, cohere)
    DEFAULT_PROVIDER: (process.env.EMBEDDING_PROVIDER || 'openai') as 'openai' | 'ollama' | 'huggingface' | 'cohere',

    // Dimension mapping for each provider
    DIMENSIONS: {
      openai: 1536,
      ollama: 768,
      huggingface: 384,
      cohere: 1024,
    } as const,

    // Database vector column dimension (should match primary provider)
    DB_VECTOR_DIM: parseInt(process.env.PGVECTOR_DIM || '1536', 10),
  },

  // === Similarity & Scoring ===
  SIMILARITY: {
    // Threshold for minimum acceptable similarity
    MIN_THRESHOLD: parseFloat(process.env.MIN_SIMILARITY || '0.5'),

    // Confidence tier thresholds
    HIGH_TIER: parseFloat(process.env.HIGH_TIER_THRESHOLD || '0.75'),
    MEDIUM_TIER: parseFloat(process.env.MEDIUM_TIER_THRESHOLD || '0.60'),
    LOW_TIER: parseFloat(process.env.LOW_TIER_THRESHOLD || '0.50'),
  },

  // === Scoring Weights ===
  SCORING: {
    // Weight for semantic similarity (70%)
    SIMILARITY_WEIGHT: parseFloat(process.env.SIMILARITY_WEIGHT || '0.7'),

    // Weight for recency (30%)
    RECENCY_WEIGHT: parseFloat(process.env.RECENCY_WEIGHT || '0.3'),

    // Recency decay half-life in days
    RECENCY_DECAY_DAYS: parseInt(process.env.RECENCY_DECAY_DAYS || '30', 10),
  },

  // === Search Configuration ===
  SEARCH: {
    // Overquery multiplier (fetch 3x to account for deduplication)
    OVERQUERY_MULTIPLIER: parseInt(process.env.OVERQUERY_MULTIPLIER || '3', 10),

    // Default max results
    MAX_RESULTS: parseInt(process.env.MAX_RESULTS || '10', 10),

    // Deduplication threshold (Jaccard similarity)
    DEDUP_THRESHOLD: parseFloat(process.env.DEDUP_THRESHOLD || '0.90'),
  },

  // === Tiering Configuration ===
  TIERING: {
    // Max items per confidence tier
    HIGH_TIER_COUNT: parseInt(process.env.HIGH_TIER_COUNT || '5', 10),
    MEDIUM_TIER_COUNT: parseInt(process.env.MEDIUM_TIER_COUNT || '3', 10),
    LOW_TIER_COUNT: parseInt(process.env.LOW_TIER_COUNT || '2', 10),
  },

  // === Token Configuration ===
  TOKENS: {
    // Characters per token estimation
    CHARS_PER_TOKEN: parseFloat(process.env.CHARS_PER_TOKEN || '3.5'),

    // Max context tokens for LLM
    MAX_CONTEXT_TOKENS: parseInt(process.env.MAX_CONTEXT_TOKENS || '8000', 10),

    // Default token budget for context formatting
    DEFAULT_BUDGET: parseInt(process.env.TOKEN_BUDGET || '500', 10),
  },

  // === REFRAG Configuration ===
  REFRAG: {
    // Enable REFRAG mode
    ENABLED: process.env.REFRAG_ENABLED === 'true',

    // Chunk size in tokens (default 16 as per REFRAG paper)
    CHUNK_SIZE_TOKENS: parseInt(process.env.REFRAG_CHUNK_SIZE || '16', 10),

    // Compression ratio (0.70 = expand top 30%, compress bottom 70%)
    COMPRESSION_RATIO: parseFloat(process.env.REFRAG_COMPRESSION_RATIO || '0.70'),

    // Minimum content length to trigger chunking (in tokens)
    MIN_CHUNK_LENGTH: parseInt(process.env.REFRAG_MIN_CHUNK_LENGTH || '32', 10),
  },

  // === Background Processing ===
  PROCESSING: {
    // Redis connection for BullMQ
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),

    // Worker concurrency
    CHUNK_WORKER_CONCURRENCY: parseInt(process.env.CHUNK_WORKER_CONCURRENCY || '5', 10),

    // Job retry configuration
    MAX_RETRIES: parseInt(process.env.CHUNK_JOB_RETRIES || '3', 10),
    RETRY_DELAY_MS: parseInt(process.env.CHUNK_RETRY_DELAY || '1000', 10),
  },

  // === Content Limits ===
  LIMITS: {
    // Max content size for storage (50KB)
    MAX_CONTENT_SIZE: parseInt(process.env.MAX_CONTENT_SIZE || '51200', 10),

    // Max summary length
    MAX_SUMMARY_LENGTH: parseInt(process.env.MAX_SUMMARY_LENGTH || '150', 10),
  },
} as const;

/**
 * Get the current embedding provider dimension
 */
export function getEmbeddingDimension(): number {
  const provider = RAG_CONFIG.EMBEDDING.DEFAULT_PROVIDER;
  return RAG_CONFIG.EMBEDDING.DIMENSIONS[provider];
}

/**
 * Get the database vector dimension
 */
export function getDatabaseVectorDimension(): number {
  return RAG_CONFIG.EMBEDDING.DB_VECTOR_DIM;
}

/**
 * Validate configuration on startup
 */
export function validateRagConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if provider dimension matches DB dimension
  const providerDim = getEmbeddingDimension();
  const dbDim = getDatabaseVectorDimension();

  if (providerDim !== dbDim) {
    errors.push(
      `Embedding dimension mismatch: Provider (${RAG_CONFIG.EMBEDDING.DEFAULT_PROVIDER}) ` +
      `returns ${providerDim} dimensions but database expects ${dbDim}. ` +
      `Update PGVECTOR_DIM environment variable or change provider.`
    );
  }

  // Check weights sum to 1.0
  const weightSum = RAG_CONFIG.SCORING.SIMILARITY_WEIGHT + RAG_CONFIG.SCORING.RECENCY_WEIGHT;
  if (Math.abs(weightSum - 1.0) > 0.01) {
    errors.push(
      `Scoring weights must sum to 1.0, got ${weightSum} ` +
      `(similarity: ${RAG_CONFIG.SCORING.SIMILARITY_WEIGHT}, ` +
      `recency: ${RAG_CONFIG.SCORING.RECENCY_WEIGHT})`
    );
  }

  // Check thresholds are in valid range
  if (RAG_CONFIG.SIMILARITY.MIN_THRESHOLD < 0 || RAG_CONFIG.SIMILARITY.MIN_THRESHOLD > 1) {
    errors.push(`MIN_SIMILARITY must be between 0 and 1, got ${RAG_CONFIG.SIMILARITY.MIN_THRESHOLD}`);
  }

  // Check REFRAG compression ratio
  if (RAG_CONFIG.REFRAG.COMPRESSION_RATIO < 0 || RAG_CONFIG.REFRAG.COMPRESSION_RATIO > 1) {
    errors.push(`REFRAG_COMPRESSION_RATIO must be between 0 and 1, got ${RAG_CONFIG.REFRAG.COMPRESSION_RATIO}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Print configuration summary
 */
export function printConfigSummary(): void {
  console.log('=== RAG Configuration ===');
  console.log(`Provider: ${RAG_CONFIG.EMBEDDING.DEFAULT_PROVIDER}`);
  console.log(`Embedding Dimensions: ${getEmbeddingDimension()}`);
  console.log(`Database Vector Dimensions: ${getDatabaseVectorDimension()}`);
  console.log(`REFRAG Enabled: ${RAG_CONFIG.REFRAG.ENABLED}`);
  if (RAG_CONFIG.REFRAG.ENABLED) {
    console.log(`  - Chunk Size: ${RAG_CONFIG.REFRAG.CHUNK_SIZE_TOKENS} tokens`);
    console.log(`  - Compression Ratio: ${(RAG_CONFIG.REFRAG.COMPRESSION_RATIO * 100).toFixed(0)}%`);
  }
  console.log(`Similarity Weight: ${RAG_CONFIG.SCORING.SIMILARITY_WEIGHT}`);
  console.log(`Recency Weight: ${RAG_CONFIG.SCORING.RECENCY_WEIGHT}`);
  console.log('========================\n');
}
