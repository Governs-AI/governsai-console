/**
 * Chunk Worker - Background processing for REFRAG chunking
 *
 * Processes context memories asynchronously:
 * 1. Chunks content into fixed-size token chunks
 * 2. Generates embeddings for each chunk
 * 3. Stores chunks with embeddings in database
 */

import { Queue, Worker, Job } from 'bullmq';
import { ChunkService } from '../services/chunk-service';
import { UniversalEmbeddingService } from '../services/embedding-service';
import { prisma } from '@governs-ai/db';
import { RAG_CONFIG, getDatabaseVectorDimension } from '../config/rag-config';
import { normalizeEmbeddingDimensions, toVectorString } from '../services/embedding-utils';

export interface ChunkJob {
  contextMemoryId: string;
  content: string;
  userId: string;
  orgId: string;
}

export interface ChunkJobResult {
  contextMemoryId: string;
  chunksCreated: number;
  totalTokens: number;
  success: boolean;
  error?: string;
}

/**
 * ChunkWorker - Manages background chunk processing
 */
export class ChunkWorker {
  private queue: Queue<ChunkJob> | null = null;
  private worker: Worker<ChunkJob, ChunkJobResult> | null = null;
  private chunkService: ChunkService;
  private embeddingService: UniversalEmbeddingService;
  private isInitialized: boolean = false;
  private redisAvailable: boolean = false;

  constructor() {
    const redisConfig = {
      host: RAG_CONFIG.PROCESSING.REDIS_HOST,
      port: RAG_CONFIG.PROCESSING.REDIS_PORT,
    };

    // Initialize services
    this.chunkService = new ChunkService();
    this.embeddingService = new UniversalEmbeddingService({
      provider: RAG_CONFIG.EMBEDDING.DEFAULT_PROVIDER,
    });

    try {
      // Create queue
      this.queue = new Queue<ChunkJob>('chunk-processing', {
        connection: redisConfig,
      defaultJobOptions: {
        attempts: RAG_CONFIG.PROCESSING.MAX_RETRIES,
        backoff: {
          type: 'exponential',
          delay: RAG_CONFIG.PROCESSING.RETRY_DELAY_MS,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
      });

      // Create worker
      this.worker = new Worker<ChunkJob, ChunkJobResult>(
        'chunk-processing',
        (job) => this.processChunks(job),
        {
          connection: redisConfig,
          concurrency: RAG_CONFIG.PROCESSING.CHUNK_WORKER_CONCURRENCY,
        }
      );

      this.setupEventHandlers();
      this.redisAvailable = true;
      this.isInitialized = true;
    } catch {
      console.warn('⚠️  Redis not available - REFRAG chunking will be disabled');
      console.warn('   To enable: Install Redis and set REDIS_HOST/REDIS_PORT');
      this.redisAvailable = false;
      this.isInitialized = false;
    }
  }

  /**
   * Setup event handlers for worker
   */
  private setupEventHandlers(): void {
    if (!this.worker || !this.queue) return;

    this.worker.on('completed', (job, result) => {
      console.log(
        `✅ Chunk job ${job.id} completed: ${result.chunksCreated} chunks for ${result.contextMemoryId}`
      );
    });

    this.worker.on('failed', (job, error) => {
      console.error(
        `❌ Chunk job ${job?.id} failed for ${job?.data.contextMemoryId}:`,
        error.message
      );
    });

    // Only log errors if DEBUG_REDIS is enabled (avoid spam when Redis is down)
    this.worker.on('error', (error) => {
      if (process.env.DEBUG_REDIS === 'true') {
        console.error('❌ Worker error:', error);
      }
    });

    this.queue.on('error', (error) => {
      if (process.env.DEBUG_REDIS === 'true') {
        console.error('❌ Queue error:', error);
      }
    });
  }

  /**
   * Queue a context memory for chunking
   *
   * @param data - Chunk job data
   * @returns Job ID
   */
  async queueChunking(data: ChunkJob): Promise<string> {
    if (!this.redisAvailable || !this.queue) {
      console.log('⏭️  Skipping chunking (Redis not available)');
      return 'skipped';
    }

    if (!this.isInitialized) {
      throw new Error('ChunkWorker not initialized');
    }

    // Check if content should be chunked
    if (!this.chunkService.shouldChunk(data.content)) {
      console.log(`⏭️  Skipping chunking for ${data.contextMemoryId} (content too short)`);

      // Mark as computed even though we didn't chunk
      await prisma.contextMemory.update({
        where: { id: data.contextMemoryId },
        data: { chunksComputed: true },
      });

      return 'skipped';
    }

    const job = await this.queue.add('chunk', data, {
      jobId: `chunk-${data.contextMemoryId}`,
    });

    console.log(`📋 Queued chunking job ${job.id} for ${data.contextMemoryId}`);
    return job.id || 'unknown';
  }

  /**
   * Process chunks for a context memory
   *
   * @param job - BullMQ job
   * @returns Job result
   */
  private async processChunks(job: Job<ChunkJob>): Promise<ChunkJobResult> {
    const { contextMemoryId, content } = job.data;

    try {
      console.log(`🔄 Processing chunks for ${contextMemoryId}...`);

      // 1. Chunk the content
      const chunkingResult = this.chunkService.chunkContent(content);

      if (!chunkingResult.shouldChunk || chunkingResult.chunks.length === 0) {
        // Mark as computed without creating chunks
        await prisma.contextMemory.update({
          where: { id: contextMemoryId },
          data: { chunksComputed: true },
        });

        return {
          contextMemoryId,
          chunksCreated: 0,
          totalTokens: chunkingResult.totalTokens,
          success: true,
        };
      }

      // 2. Generate embeddings for each chunk
      const chunkTexts = chunkingResult.chunks.map(c => c.content);
      const embeddings = await this.generateEmbeddingsBatch(chunkTexts);

      // 3. Store chunks with embeddings
      // Delete existing chunks for this context memory (idempotency)
      await prisma.contextChunk.deleteMany({
        where: { contextMemoryId },
      });

      // Create chunks without embeddings first (Prisma doesn't support Unsupported type in create)
      const chunks = await Promise.all(
        chunkingResult.chunks.map((chunk) =>
          prisma.contextChunk.create({
            data: {
              id: `${contextMemoryId}-chunk-${chunk.index}`,
              contextMemoryId,
              chunkIndex: chunk.index,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
            },
          })
        )
      );

      // 4. Set embeddings using raw SQL (pgvector Unsupported type)
      const vectorDim = getDatabaseVectorDimension();
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = normalizeEmbeddingDimensions(embeddings[i], vectorDim);
        const embeddingStr = toVectorString(embedding);

        await prisma.$executeRawUnsafe(
          `UPDATE context_chunks SET embedding = $1::vector(${vectorDim}) WHERE id = $2`,
          embeddingStr,
          chunk.id
        );
      }

      // 5. Mark context memory as computed
      await prisma.contextMemory.update({
        where: { id: contextMemoryId },
        data: { chunksComputed: true },
      });

      console.log(
        `✅ Created ${chunkingResult.chunks.length} chunks for ${contextMemoryId} ` +
        `(${chunkingResult.totalTokens} tokens)`
      );

      return {
        contextMemoryId,
        chunksCreated: chunkingResult.chunks.length,
        totalTokens: chunkingResult.totalTokens,
        success: true,
      };
    } catch (error) {
      console.error(`❌ Chunk processing failed for ${contextMemoryId}:`, error);

      return {
        contextMemoryId,
        chunksCreated: 0,
        totalTokens: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate embeddings for a batch of texts
   *
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, Math.min(i + batchSize, texts.length));

      const batchEmbeddings = await Promise.all(
        batch.map(text => this.embeddingService.generateEmbedding(text))
      );

      embeddings.push(...batchEmbeddings);

      // Small delay to avoid rate limits
      if (i + batchSize < texts.length) {
        await this.sleep(100);
      }
    }

    return embeddings;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  /**
   * Get job status
   *
   * @param jobId - Job ID
   */
  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }

  /**
   * Close worker and queue
   */
  async close(): Promise<void> {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
    this.isInitialized = false;
    console.log('🔴 ChunkWorker closed');
  }

  /**
   * Utility: Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let chunkWorkerInstance: ChunkWorker | null = null;

/**
 * Get or create chunk worker instance
 */
export function getChunkWorker(): ChunkWorker {
  if (!chunkWorkerInstance) {
    chunkWorkerInstance = new ChunkWorker();
    console.log('🟢 ChunkWorker initialized');
  }
  return chunkWorkerInstance;
}

/**
 * Queue chunking job (convenience function)
 */
export async function queueChunking(data: ChunkJob): Promise<string> {
  const worker = getChunkWorker();
  return worker.queueChunking(data);
}

/**
 * Get queue statistics (convenience function)
 */
export async function getChunkQueueStats() {
  const worker = getChunkWorker();
  return worker.getQueueStats();
}
