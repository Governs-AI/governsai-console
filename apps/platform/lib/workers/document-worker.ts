/**
 * Document Worker - Background processing for document OCR + chunking
 *
 * Processes documents asynchronously:
 * 1. Read stored file
 * 2. Extract text via OCR
 * 3. Chunk content + generate embeddings
 * 4. Store chunks in database
 */

import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '@governs-ai/db';
import { documentProcessor } from '../services/document-processor';
import { RAG_CONFIG } from '../config/rag-config';

export interface DocumentJob {
  documentId: string;
  orgId: string;
  filename: string;
  contentType: string;
  storageUrl: string;
  fileHash: string;
  metadata?: Record<string, any>;
}

export interface DocumentJobResult {
  documentId: string;
  chunkCount: number;
  success: boolean;
  error?: string;
}

export class DocumentWorker {
  private queue: Queue<DocumentJob> | null = null;
  private worker: Worker<DocumentJob, DocumentJobResult> | null = null;
  private isInitialized: boolean = false;
  private redisAvailable: boolean = false;

  constructor() {
    const redisConfig = {
      host: RAG_CONFIG.PROCESSING.REDIS_HOST,
      port: RAG_CONFIG.PROCESSING.REDIS_PORT,
    };

    try {
      this.queue = new Queue<DocumentJob>('document-processing', {
        connection: redisConfig,
        defaultJobOptions: {
          attempts: RAG_CONFIG.PROCESSING.MAX_RETRIES,
          backoff: {
            type: 'exponential',
            delay: RAG_CONFIG.PROCESSING.RETRY_DELAY_MS,
          },
          removeOnComplete: {
            age: 3600,
            count: 100,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        },
      });

      this.worker = new Worker<DocumentJob, DocumentJobResult>(
        'document-processing',
        (job) => this.processDocument(job),
        {
          connection: redisConfig,
          concurrency: parseInt(process.env.DOCUMENT_WORKER_CONCURRENCY || '', 10)
            || RAG_CONFIG.PROCESSING.CHUNK_WORKER_CONCURRENCY,
        }
      );

      this.setupEventHandlers();
      this.redisAvailable = true;
      this.isInitialized = true;
    } catch {
      console.warn('⚠️  Redis not available - async document processing disabled');
      console.warn('   To enable: Install Redis and set REDIS_HOST/REDIS_PORT');
      this.redisAvailable = false;
      this.isInitialized = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.worker || !this.queue) return;

    this.worker.on('completed', (job, result) => {
      console.log(
        `✅ Document job ${job.id} completed: ${result.chunkCount} chunks for ${result.documentId}`
      );
    });

    this.worker.on('failed', (job, error) => {
      console.error(
        `❌ Document job ${job?.id} failed for ${job?.data.documentId}:`,
        error.message
      );
    });

    this.worker.on('error', (error) => {
      if (process.env.DEBUG_REDIS === 'true') {
        console.error('❌ Document worker error:', error);
      }
    });

    this.queue.on('error', (error) => {
      if (process.env.DEBUG_REDIS === 'true') {
        console.error('❌ Document queue error:', error);
      }
    });
  }

  async queueDocumentProcessing(data: DocumentJob): Promise<string> {
    if (!this.redisAvailable || !this.queue) {
      console.log('⏭️  Skipping document queue (Redis not available)');
      return 'skipped';
    }

    if (!this.isInitialized) {
      throw new Error('DocumentWorker not initialized');
    }

    const job = await this.queue.add('document', data, {
      jobId: `document-${data.documentId}`,
    });

    console.log(`📋 Queued document job ${job.id} for ${data.documentId}`);
    return job.id || 'unknown';
  }

  async getQueueStats() {
    if (!this.queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
      };
    }

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

  private async processDocument(job: Job<DocumentJob>): Promise<DocumentJobResult> {
    const { documentId, storageUrl, filename, contentType, metadata } = job.data;

    try {
      const result = await documentProcessor.processDocumentFromStorage({
        documentId,
        storageUrl,
        filename,
        contentType,
        metadata,
      });

      return {
        documentId,
        chunkCount: result.chunkCount,
        success: true,
      };
    } catch (error: any) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          errorMessage: error?.message || 'Document processing failed',
        },
      });

      return {
        documentId,
        chunkCount: 0,
        success: false,
        error: error?.message || 'Document processing failed',
      };
    }
  }
}

let documentWorkerInstance: DocumentWorker | null = null;

export function getDocumentWorker(): DocumentWorker {
  if (!documentWorkerInstance) {
    documentWorkerInstance = new DocumentWorker();
    console.log('🟢 DocumentWorker initialized');
  }
  return documentWorkerInstance;
}

export async function queueDocumentProcessing(data: DocumentJob): Promise<string> {
  const worker = getDocumentWorker();
  return worker.queueDocumentProcessing(data);
}

export async function getDocumentQueueStats() {
  const worker = getDocumentWorker();
  return worker.getQueueStats();
}
