import { prisma } from '@governs-ai/db';
import type { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { ChunkService, type Chunk } from './chunk-service';
import { ocrService } from './ocr-service';
import { FileStorageService, fileStorageService } from './file-storage';
import { createEmbeddingService, embeddingConfigs, type EmbeddingConfig, UniversalEmbeddingService } from './embedding-service';
import { normalizeEmbeddingDimensions, toVectorString } from './embedding-utils';
import { getDatabaseVectorDimension, RAG_CONFIG } from '../config/rag-config';

const dbAny = prisma as any;

export interface DocumentUploadInput {
  userId: string;
  orgId: string;
  filename: string;
  buffer: Buffer;
  contentType?: string;
  externalUserId?: string;
  externalSource?: string;
  metadata?: Record<string, any>;
  scope?: 'user' | 'org';
  visibility?: 'private' | 'team' | 'org';
}

export interface DocumentProcessingResult {
  documentId: string;
  status: 'completed' | 'failed' | 'processing';
  chunkCount: number;
  fileHash: string;
  storageUrl: string | null;
}

export interface DocumentSearchParams {
  orgId: string;
  query: string;
  userId?: string;
  externalUserId?: string;
  externalSource?: string;
  documentIds?: string[];
  contentTypes?: string[];
  limit?: number;
  threshold?: number;
}

export interface DocumentSearchResult {
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  document: {
    filename: string;
    contentType: string;
    userId: string;
    externalUserId: string | null;
    externalSource: string | null;
    createdAt: Date;
  };
}

export class DocumentProcessor {
  private storage: FileStorageService;
  private chunkService: ChunkService;
  private embeddingService: UniversalEmbeddingService;

  constructor(options?: {
    storageService?: FileStorageService;
    embeddingConfig?: EmbeddingConfig;
    chunkSize?: number;
    minChunkLength?: number;
  }) {
    const chunkSize = options?.chunkSize
      || parseInt(process.env.DOCUMENT_CHUNK_SIZE_TOKENS || '', 10)
      || RAG_CONFIG.REFRAG.CHUNK_SIZE_TOKENS;
    const minChunkLength = options?.minChunkLength
      || parseInt(process.env.DOCUMENT_MIN_CHUNK_LENGTH || '', 10)
      || RAG_CONFIG.REFRAG.MIN_CHUNK_LENGTH;

    this.storage = options?.storageService || fileStorageService;
    this.chunkService = new ChunkService(chunkSize, minChunkLength);
    this.embeddingService = createEmbeddingService(options?.embeddingConfig || this.getDefaultEmbeddingConfig());
  }

  private getDefaultEmbeddingConfig(): EmbeddingConfig {
    if (process.env.OLLAMA_BASE_URL || process.env.EMBEDDING_PROVIDER === 'ollama') {
      return {
        ...embeddingConfigs.ollama,
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      };
    }

    if (process.env.HUGGINGFACE_API_KEY || process.env.EMBEDDING_PROVIDER === 'huggingface') {
      return {
        ...embeddingConfigs.huggingface,
        model: process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
      };
    }

    if (process.env.COHERE_API_KEY || process.env.EMBEDDING_PROVIDER === 'cohere') {
      return embeddingConfigs.cohere;
    }

    return embeddingConfigs.openai;
  }

  private computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private buildChunkMetadata(params: {
    filename: string;
    contentType: string;
    pageCount?: number;
    confidence?: number;
    metadata?: Record<string, any>;
  }) {
    return {
      filename: params.filename,
      contentType: params.contentType,
      pageCount: params.pageCount ?? null,
      confidence: params.confidence ?? null,
      extractedAt: new Date().toISOString(),
      ...(params.metadata || {}),
    };
  }

  private async storeChunks(documentId: string, chunks: Chunk[], metadata: Record<string, any>): Promise<void> {
    await prisma.documentChunk.deleteMany({ where: { documentId } });

    const dim = getDatabaseVectorDimension();
    for (const chunk of chunks) {
      const created = await prisma.documentChunk.create({
        data: {
          documentId,
          content: chunk.content,
          chunkIndex: chunk.index,
          metadata,
        },
        select: { id: true },
      });

      const embeddingRaw = await this.embeddingService.generateEmbedding(chunk.content);
      const embedding = normalizeEmbeddingDimensions(embeddingRaw);
      const embeddingStr = toVectorString(embedding);

      await dbAny.$executeRawUnsafe(
        `UPDATE document_chunks SET embedding = $1::vector(${dim}) WHERE id = $2`,
        embeddingStr,
        created.id
      );
    }
  }

  async createDocumentRecord(input: DocumentUploadInput): Promise<{
    documentId: string;
    fileHash: string;
    storageUrl: string;
    contentType: string;
  }> {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error('Empty file upload');
    }

    if (!ocrService.isSupportedFormat(input.filename)) {
      throw new Error(`Unsupported file format: ${input.filename}`);
    }

    const fileHash = this.computeHash(input.buffer);
    const contentType = input.contentType || ocrService.getMimeType(input.filename);
    const externalSource = input.externalUserId ? (input.externalSource || 'default') : input.externalSource || null;

    const document = await prisma.document.create({
      data: {
        userId: input.userId,
        orgId: input.orgId,
        externalUserId: input.externalUserId || null,
        externalSource,
        filename: input.filename,
        contentType,
        fileSize: input.buffer.length,
        fileHash,
        status: 'processing',
        scope: input.scope || 'org',
        visibility: input.visibility || 'org',
      },
      select: { id: true },
    });

    try {
      const stored = await this.storage.storeFile({
        buffer: input.buffer,
        filename: input.filename,
        orgId: input.orgId,
        fileHash,
      });

      await prisma.document.update({
        where: { id: document.id },
        data: { storageUrl: stored.storageUrl },
      });

      return {
        documentId: document.id,
        fileHash,
        storageUrl: stored.storageUrl,
        contentType,
      };
    } catch (error: any) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'failed',
          errorMessage: error?.message || 'Document storage failed',
        },
      });
      throw error;
    }
  }

  async processDocumentBuffer(params: {
    documentId: string;
    buffer: Buffer;
    filename: string;
    contentType: string;
    metadata?: Record<string, any>;
  }): Promise<{ chunkCount: number }> {
    try {
      const extraction = await ocrService.extractText(params.buffer, params.filename);
      const text = extraction.text.trim();
      if (!text) {
        throw new Error('No text could be extracted from document');
      }

      await prisma.document.update({
        where: { id: params.documentId },
        data: { content: text },
      });

      const chunkingResult = this.chunkService.chunkContent(text);
      const chunkMetadata = this.buildChunkMetadata({
        filename: params.filename,
        contentType: params.contentType,
        pageCount: extraction.pageCount,
        confidence: extraction.confidence,
        metadata: params.metadata,
      });

      await this.storeChunks(params.documentId, chunkingResult.chunks, chunkMetadata);

      await prisma.document.update({
        where: { id: params.documentId },
        data: {
          status: 'completed',
          chunkCount: chunkingResult.chunks.length,
        },
      });

      return { chunkCount: chunkingResult.chunks.length };
    } catch (error: any) {
      await prisma.document.update({
        where: { id: params.documentId },
        data: {
          status: 'failed',
          errorMessage: error?.message || 'Document processing failed',
        },
      });
      throw error;
    }
  }

  async processDocumentFromStorage(params: {
    documentId: string;
    storageUrl: string;
    filename: string;
    contentType: string;
    metadata?: Record<string, any>;
  }): Promise<{ chunkCount: number }> {
    const localPath = this.storage.getLocalPath(params.storageUrl);
    if (!localPath) {
      throw new Error('Document storage URL is not available on this worker');
    }

    const buffer = await fs.readFile(localPath);
    return this.processDocumentBuffer({
      documentId: params.documentId,
      buffer,
      filename: params.filename,
      contentType: params.contentType,
      metadata: params.metadata,
    });
  }

  async uploadDocument(input: DocumentUploadInput): Promise<DocumentProcessingResult> {
    const record = await this.createDocumentRecord(input);
    const processed = await this.processDocumentBuffer({
      documentId: record.documentId,
      buffer: input.buffer,
      filename: input.filename,
      contentType: record.contentType,
      metadata: input.metadata,
    });

    return {
      documentId: record.documentId,
      status: 'completed',
      chunkCount: processed.chunkCount,
      fileHash: record.fileHash,
      storageUrl: record.storageUrl,
    };
  }

  async getDocument(params: {
    documentId: string;
    orgId: string;
    includeChunks?: boolean;
    includeContent?: boolean;
  }) {
    const document = await prisma.document.findFirst({
      where: { id: params.documentId, orgId: params.orgId },
      select: {
        id: true,
        userId: true,
        orgId: true,
        externalUserId: true,
        externalSource: true,
        filename: true,
        contentType: true,
        fileSize: true,
        fileHash: true,
        storageUrl: true,
        content: params.includeContent || false,
        status: true,
        errorMessage: true,
        chunkCount: true,
        scope: true,
        visibility: true,
        piiDetected: true,
        piiRedacted: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });

    if (!document) return null;

    if (!params.includeChunks) {
      return document;
    }

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: document.id },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkIndex: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    return { ...document, chunks };
  }

  async listDocuments(params: {
    orgId: string;
    userId?: string;
    externalUserId?: string;
    externalSource?: string;
    status?: string;
    contentType?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.DocumentWhereInput = {
      orgId: params.orgId,
      isArchived: params.includeArchived ? undefined : false,
    };

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.externalUserId) {
      where.externalUserId = params.externalUserId;
      where.externalSource = params.externalSource || 'default';
    } else if (params.externalSource) {
      where.externalSource = params.externalSource;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.contentType) {
      where.contentType = params.contentType;
    }

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          userId: true,
          orgId: true,
          externalUserId: true,
          externalSource: true,
          filename: true,
          contentType: true,
          fileSize: true,
          fileHash: true,
          storageUrl: true,
          status: true,
          errorMessage: true,
          chunkCount: true,
          scope: true,
          visibility: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.document.count({ where }),
    ]);

    const hasMore = offset + limit < total;
    const totalPages = Math.ceil(total / limit) || 1;
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      documents,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
        totalPages,
        currentPage,
      },
    };
  }

  async searchDocuments(params: DocumentSearchParams): Promise<DocumentSearchResult[]> {
    const limit = params.limit ?? RAG_CONFIG.SEARCH.MAX_RESULTS;
    const threshold = params.threshold ?? RAG_CONFIG.SIMILARITY.MIN_THRESHOLD;

    const queryEmbeddingRaw = await this.embeddingService.generateEmbedding(params.query);
    const queryEmbedding = normalizeEmbeddingDimensions(queryEmbeddingRaw);
    const embeddingStr = toVectorString(queryEmbedding);
    const dim = getDatabaseVectorDimension();

    let sql = `
      SELECT
        dc.id as chunk_id,
        dc.document_id,
        dc.chunk_index,
        dc.content as chunk_content,
        dc.metadata as chunk_metadata,
        d.filename,
        d.content_type,
        d.user_id,
        d.external_user_id,
        d.external_source,
        d.created_at,
        1 - (dc.embedding <=> $1::vector(${dim})) as similarity
      FROM document_chunks dc
      INNER JOIN documents d ON d.id = dc.document_id
      WHERE d.is_archived = false
        AND d.status = 'completed'
        AND dc.embedding IS NOT NULL
    `;

    const sqlParams: any[] = [embeddingStr];
    let paramIndex = 2;

    sql += ` AND d.org_id = $${paramIndex}`;
    sqlParams.push(params.orgId);
    paramIndex++;

    if (params.userId) {
      sql += ` AND d.user_id = $${paramIndex}`;
      sqlParams.push(params.userId);
      paramIndex++;
    }

    if (params.externalUserId) {
      sql += ` AND d.external_user_id = $${paramIndex}`;
      sqlParams.push(params.externalUserId);
      paramIndex++;

      sql += ` AND d.external_source = $${paramIndex}`;
      sqlParams.push(params.externalSource || 'default');
      paramIndex++;
    } else if (params.externalSource) {
      sql += ` AND d.external_source = $${paramIndex}`;
      sqlParams.push(params.externalSource);
      paramIndex++;
    }

    if (params.documentIds && params.documentIds.length > 0) {
      sql += ` AND d.id = ANY($${paramIndex}::text[])`;
      sqlParams.push(params.documentIds);
      paramIndex++;
    }

    if (params.contentTypes && params.contentTypes.length > 0) {
      sql += ` AND d.content_type = ANY($${paramIndex}::text[])`;
      sqlParams.push(params.contentTypes);
      paramIndex++;
    }

    sql += ` AND 1 - (dc.embedding <=> $1::vector(${dim})) > $${paramIndex}`;
    sqlParams.push(threshold);
    paramIndex++;

    sql += ` ORDER BY dc.embedding <=> $1::vector(${dim}) LIMIT $${paramIndex}`;
    sqlParams.push(limit);

    const rows = await dbAny.$queryRawUnsafe(sql, ...sqlParams) as Array<{
      chunk_id: string;
      document_id: string;
      chunk_index: number;
      chunk_content: string;
      chunk_metadata: Record<string, any>;
      filename: string;
      content_type: string;
      user_id: string;
      external_user_id: string | null;
      external_source: string | null;
      created_at: Date;
      similarity: string | number;
    }>;

    return rows.map((row) => ({
      documentId: row.document_id,
      chunkId: row.chunk_id,
      chunkIndex: row.chunk_index,
      content: row.chunk_content,
      metadata: row.chunk_metadata || {},
      similarity: typeof row.similarity === 'number' ? row.similarity : parseFloat(row.similarity),
      document: {
        filename: row.filename,
        contentType: row.content_type,
        userId: row.user_id,
        externalUserId: row.external_user_id,
        externalSource: row.external_source,
        createdAt: row.created_at,
      },
    }));
  }

  async deleteDocument(params: { documentId: string; orgId: string }) {
    const document = await prisma.document.findFirst({
      where: { id: params.documentId, orgId: params.orgId },
      select: { id: true, fileHash: true, storageUrl: true },
    });

    if (!document) {
      return { deleted: false, fileDeleted: false };
    }

    const remaining = await prisma.document.count({
      where: {
        orgId: params.orgId,
        fileHash: document.fileHash,
        id: { not: document.id },
      },
    });

    await prisma.document.delete({ where: { id: document.id } });

    let fileDeleted = false;
    if (document.storageUrl && remaining === 0) {
      fileDeleted = await this.storage.deleteFile(document.storageUrl);
    }

    return { deleted: true, fileDeleted };
  }
}

export const documentProcessor = new DocumentProcessor();
