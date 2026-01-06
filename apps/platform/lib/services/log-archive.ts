import { randomUUID } from 'crypto';
import { prisma } from '@governs-ai/db';
import { getDatabaseVectorDimension } from '../config/rag-config';
import { normalizeEmbeddingDimensions, toVectorString } from './embedding-utils';

export type ArchiveMode = 'copy' | 'move';

export interface ArchiveInclude {
  contextMemory: boolean;
  contextChunks: boolean;
  conversations: boolean;
  decisions: boolean;
  usageRecords: boolean;
  purchaseRecords: boolean;
  contextAccessLogs: boolean;
}

export interface ArchiveOptions {
  orgId: string;
  startTime?: Date;
  endTime?: Date;
  mode?: ArchiveMode;
  include?: Partial<ArchiveInclude>;
}

export interface ArchiveCounts {
  contextMemory: number;
  contextChunks: number;
  conversations: number;
  decisions: number;
  usageRecords: number;
  purchaseRecords: number;
  contextAccessLogs: number;
}

export interface ContextMemoryArchive {
  id: string;
  userId: string;
  orgId: string;
  content: string;
  summary: string | null;
  contentType: string;
  metadata: Record<string, any>;
  agentId: string | null;
  agentName: string | null;
  embedding: number[] | null;
  chunksComputed: boolean;
  retention: string;
  archivedAt: string | null;
  archivedUrl: string | null;
  starred: boolean;
  upvoted: boolean;
  importance: number;
  conversationId: string | null;
  parentId: string | null;
  correlationId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  isArchived: boolean;
  piiDetected: boolean;
  piiRedacted: boolean;
  rawContent: string | null;
  precheckDecision: string | null;
  scope: string;
  visibility: string;
}

export interface ContextChunkArchive {
  id: string;
  contextMemoryId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: number[] | null;
  createdAt: string;
}

export interface ConversationArchive {
  id: string;
  userId: string;
  orgId: string;
  title: string | null;
  summary: string | null;
  agentId: string | null;
  agentName: string | null;
  messageCount: number;
  tokenCount: number;
  cost: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  isArchived: boolean;
  scope: string;
}

export interface DecisionArchive {
  id: string;
  orgId: string;
  direction: string;
  decision: string;
  tool: string | null;
  scope: string | null;
  detectorSummary: Record<string, any>;
  payloadHash: string;
  payloadOut: Record<string, any> | null;
  reasons: any[];
  policyId: string | null;
  latencyMs: number | null;
  correlationId: string | null;
  tags: any[];
  ts: string;
}

export interface UsageRecordArchive {
  id: string;
  userId: string;
  orgId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: string;
  costType: string;
  tool: string | null;
  correlationId: string | null;
  timestamp: string;
  metadata: Record<string, any>;
  apiKeyId: string | null;
  providerId: string | null;
}

export interface PurchaseRecordArchive {
  id: string;
  userId: string;
  orgId: string;
  tool: string;
  amount: string;
  currency: string;
  description: string | null;
  vendor: string | null;
  category: string | null;
  correlationId: string | null;
  timestamp: string;
  metadata: Record<string, any>;
  apiKeyId: string | null;
}

export interface ContextAccessLogArchive {
  id: string;
  contextId: string | null;
  userId: string;
  orgId: string;
  accessType: string;
  query: string | null;
  resultsCount: number | null;
  createdAt: string;
}

export interface ArchivePayload {
  version: number;
  exportId: string;
  exportedAt: string;
  orgId: string;
  mode: ArchiveMode;
  range: {
    startTime: string | null;
    endTime: string | null;
  };
  counts: ArchiveCounts;
  datasets: {
    contextMemory: ContextMemoryArchive[];
    contextChunks: ContextChunkArchive[];
    conversations: ConversationArchive[];
    decisions: DecisionArchive[];
    usageRecords: UsageRecordArchive[];
    purchaseRecords: PurchaseRecordArchive[];
    contextAccessLogs: ContextAccessLogArchive[];
  };
}

export const DEFAULT_ARCHIVE_INCLUDE: ArchiveInclude = {
  contextMemory: true,
  contextChunks: true,
  conversations: true,
  decisions: true,
  usageRecords: true,
  purchaseRecords: true,
  contextAccessLogs: true,
};

export function resolveArchiveInclude(overrides?: Partial<ArchiveInclude>): ArchiveInclude {
  return { ...DEFAULT_ARCHIVE_INCLUDE, ...(overrides || {}) };
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseVectorText(value: string | null): number[] | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  const body = trimmed.slice(1, -1).trim();
  if (!body) return [];
  return body.split(',').map(part => {
    const num = parseFloat(part.trim());
    return Number.isFinite(num) ? num : 0;
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function buildTimeFilter(field: string, startTime?: Date, endTime?: Date) {
  if (!startTime && !endTime) return {};
  const filter: { gte?: Date; lte?: Date } = {};
  if (startTime) filter.gte = startTime;
  if (endTime) filter.lte = endTime;
  return { [field]: filter };
}

function toDecimalString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (value && typeof (value as any).toString === 'function') {
    return (value as any).toString();
  }
  return '0';
}

async function fetchEmbeddingMap(
  table: 'context_memory' | 'context_chunks',
  ids: string[]
): Promise<Map<string, number[] | null>> {
  const embeddings = new Map<string, number[] | null>();
  if (!ids.length) return embeddings;

  const batches = chunkArray(ids, 2000);
  for (const batch of batches) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; embedding: string | null }>>(
      `SELECT id, embedding::text as embedding FROM ${table} WHERE id = ANY($1)`,
      batch
    );
    for (const row of rows) {
      embeddings.set(row.id, parseVectorText(row.embedding));
    }
  }

  return embeddings;
}

async function clearContextEmbeddings(contextIds: string[]) {
  if (!contextIds.length) return;
  const batches = chunkArray(contextIds, 2000);
  for (const batch of batches) {
    await prisma.$executeRawUnsafe(
      `UPDATE context_memory SET embedding = NULL WHERE id = ANY($1)`,
      batch
    );
  }
}

async function setContextEmbeddings(
  embeddings: Array<{ id: string; embedding: number[] }>
) {
  if (!embeddings.length) return;
  const vectorDim = getDatabaseVectorDimension();

  for (const item of embeddings) {
    const normalized = normalizeEmbeddingDimensions(item.embedding, vectorDim);
    const embeddingStr = toVectorString(normalized);
    await prisma.$executeRawUnsafe(
      `UPDATE context_memory SET embedding = $1::vector(${vectorDim}) WHERE id = $2`,
      embeddingStr,
      item.id
    );
  }
}

async function setChunkEmbeddings(
  embeddings: Array<{ id: string; embedding: number[] }>
) {
  if (!embeddings.length) return;
  const vectorDim = getDatabaseVectorDimension();

  for (const item of embeddings) {
    const normalized = normalizeEmbeddingDimensions(item.embedding, vectorDim);
    const embeddingStr = toVectorString(normalized);
    await prisma.$executeRawUnsafe(
      `UPDATE context_chunks SET embedding = $1::vector(${vectorDim}) WHERE id = $2`,
      embeddingStr,
      item.id
    );
  }
}

export async function buildArchive(options: ArchiveOptions): Promise<ArchivePayload> {
  const { orgId, startTime, endTime } = options;
  const include = resolveArchiveInclude(options.include);
  const mode: ArchiveMode = options.mode || 'copy';
  const exportId = randomUUID();
  const exportedAt = new Date();

  const contextWhere = {
    orgId,
    ...buildTimeFilter('createdAt', startTime, endTime),
  };

  const contextMemories = include.contextMemory
    ? await prisma.contextMemory.findMany({
        where: contextWhere,
        select: {
          id: true,
          userId: true,
          orgId: true,
          content: true,
          summary: true,
          contentType: true,
          metadata: true,
          agentId: true,
          agentName: true,
          chunksComputed: true,
          retention: true,
          archivedAt: true,
          archivedUrl: true,
          starred: true,
          upvoted: true,
          importance: true,
          conversationId: true,
          parentId: true,
          correlationId: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          isArchived: true,
          piiDetected: true,
          piiRedacted: true,
          rawContent: true,
          precheckDecision: true,
          scope: true,
          visibility: true,
        },
      })
    : [];

  const contextIds = contextMemories.map(memory => memory.id);
  const conversationIds = Array.from(
    new Set(
      contextMemories
        .map(memory => memory.conversationId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const contextEmbeddings = include.contextMemory
    ? await fetchEmbeddingMap('context_memory', contextIds)
    : new Map<string, number[] | null>();

  const archivedMemories: ContextMemoryArchive[] = contextMemories.map(memory => ({
    id: memory.id,
    userId: memory.userId,
    orgId: memory.orgId,
    content: memory.content,
    summary: memory.summary,
    contentType: memory.contentType,
    metadata: memory.metadata as Record<string, any>,
    agentId: memory.agentId,
    agentName: memory.agentName,
    embedding: contextEmbeddings.get(memory.id) ?? null,
    chunksComputed: memory.chunksComputed,
    retention: memory.retention,
    archivedAt: toIso(memory.archivedAt),
    archivedUrl: memory.archivedUrl,
    starred: memory.starred,
    upvoted: memory.upvoted,
    importance: memory.importance,
    conversationId: memory.conversationId,
    parentId: memory.parentId,
    correlationId: memory.correlationId,
    createdAt: toIso(memory.createdAt) || new Date().toISOString(),
    updatedAt: toIso(memory.updatedAt) || new Date().toISOString(),
    expiresAt: toIso(memory.expiresAt),
    isArchived: memory.isArchived,
    piiDetected: memory.piiDetected,
    piiRedacted: memory.piiRedacted,
    rawContent: memory.rawContent,
    precheckDecision: memory.precheckDecision,
    scope: memory.scope,
    visibility: memory.visibility,
  }));

  let archivedChunks: ContextChunkArchive[] = [];
  if (include.contextChunks && contextIds.length) {
    const chunks = await prisma.contextChunk.findMany({
      where: {
        contextMemoryId: { in: contextIds },
      },
      select: {
        id: true,
        contextMemoryId: true,
        chunkIndex: true,
        content: true,
        tokenCount: true,
        createdAt: true,
      },
    });
    const chunkIds = chunks.map(chunk => chunk.id);
    const chunkEmbeddings = await fetchEmbeddingMap('context_chunks', chunkIds);
    archivedChunks = chunks.map(chunk => ({
      id: chunk.id,
      contextMemoryId: chunk.contextMemoryId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: chunkEmbeddings.get(chunk.id) ?? null,
      createdAt: toIso(chunk.createdAt) || new Date().toISOString(),
    }));
  }

  const conversations = include.conversations && conversationIds.length
    ? await prisma.conversation.findMany({
        where: { id: { in: conversationIds } },
        select: {
          id: true,
          userId: true,
          orgId: true,
          title: true,
          summary: true,
          agentId: true,
          agentName: true,
          messageCount: true,
          tokenCount: true,
          cost: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          lastMessageAt: true,
          isArchived: true,
          scope: true,
        },
      })
    : [];

  const archivedConversations: ConversationArchive[] = conversations.map(convo => ({
    id: convo.id,
    userId: convo.userId,
    orgId: convo.orgId,
    title: convo.title,
    summary: convo.summary,
    agentId: convo.agentId,
    agentName: convo.agentName,
    messageCount: convo.messageCount,
    tokenCount: convo.tokenCount,
    cost: convo.cost,
    tags: convo.tags,
    createdAt: toIso(convo.createdAt) || new Date().toISOString(),
    updatedAt: toIso(convo.updatedAt) || new Date().toISOString(),
    lastMessageAt: toIso(convo.lastMessageAt),
    isArchived: convo.isArchived,
    scope: convo.scope,
  }));

  const decisionWhere = {
    orgId,
    ...buildTimeFilter('ts', startTime, endTime),
  };

  const decisions = include.decisions
    ? await prisma.decision.findMany({ where: decisionWhere })
    : [];

  const archivedDecisions: DecisionArchive[] = decisions.map(decision => ({
    id: decision.id,
    orgId: decision.orgId,
    direction: decision.direction,
    decision: decision.decision,
    tool: decision.tool,
    scope: decision.scope,
    detectorSummary: decision.detectorSummary as Record<string, any>,
    payloadHash: decision.payloadHash,
    payloadOut: decision.payloadOut as Record<string, any> | null,
    reasons: Array.isArray(decision.reasons) ? (decision.reasons as any[]) : [],
    policyId: decision.policyId,
    latencyMs: decision.latencyMs,
    correlationId: decision.correlationId,
    tags: Array.isArray(decision.tags) ? (decision.tags as any[]) : [],
    ts: toIso(decision.ts) || new Date().toISOString(),
  }));

  const usageWhere = {
    orgId,
    ...buildTimeFilter('timestamp', startTime, endTime),
  };

  const usageRecords = include.usageRecords
    ? await prisma.usageRecord.findMany({ where: usageWhere })
    : [];

  const archivedUsage: UsageRecordArchive[] = usageRecords.map(record => ({
    id: record.id,
    userId: record.userId,
    orgId: record.orgId,
    provider: record.provider,
    model: record.model,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    cost: toDecimalString(record.cost),
    costType: record.costType,
    tool: record.tool,
    correlationId: record.correlationId,
    timestamp: toIso(record.timestamp) || new Date().toISOString(),
    metadata: record.metadata as Record<string, any>,
    apiKeyId: record.apiKeyId,
    providerId: record.providerId,
  }));

  const purchaseWhere = {
    orgId,
    ...buildTimeFilter('timestamp', startTime, endTime),
  };

  const purchaseRecords = include.purchaseRecords
    ? await prisma.purchaseRecord.findMany({ where: purchaseWhere })
    : [];

  const archivedPurchases: PurchaseRecordArchive[] = purchaseRecords.map(record => ({
    id: record.id,
    userId: record.userId,
    orgId: record.orgId,
    tool: record.tool,
    amount: toDecimalString(record.amount),
    currency: record.currency,
    description: record.description,
    vendor: record.vendor,
    category: record.category,
    correlationId: record.correlationId,
    timestamp: toIso(record.timestamp) || new Date().toISOString(),
    metadata: record.metadata as Record<string, any>,
    apiKeyId: record.apiKeyId,
  }));

  const accessLogWhere = {
    orgId,
    ...buildTimeFilter('createdAt', startTime, endTime),
  };

  const accessLogs = include.contextAccessLogs
    ? await prisma.contextAccessLog.findMany({ where: accessLogWhere })
    : [];

  const archivedAccessLogs: ContextAccessLogArchive[] = accessLogs.map(log => ({
    id: log.id,
    contextId: log.contextId,
    userId: log.userId,
    orgId: log.orgId,
    accessType: log.accessType,
    query: log.query,
    resultsCount: log.resultsCount,
    createdAt: toIso(log.createdAt) || new Date().toISOString(),
  }));

  if (mode === 'move') {
    if (contextIds.length) {
      await prisma.contextChunk.deleteMany({
        where: { contextMemoryId: { in: contextIds } },
      });
      await clearContextEmbeddings(contextIds);
      await prisma.contextMemory.updateMany({
        where: { id: { in: contextIds } },
        data: {
          retention: 'cold',
          archivedAt: exportedAt,
          archivedUrl: `manual://archive/${exportId}`,
          chunksComputed: false,
        },
      });
    }

    if (decisions.length) {
      await prisma.decision.deleteMany({ where: decisionWhere });
    }

    if (usageRecords.length) {
      await prisma.usageRecord.deleteMany({ where: usageWhere });
    }

    if (purchaseRecords.length) {
      await prisma.purchaseRecord.deleteMany({ where: purchaseWhere });
    }

    if (accessLogs.length) {
      await prisma.contextAccessLog.deleteMany({ where: accessLogWhere });
    }
  }

  const counts: ArchiveCounts = {
    contextMemory: archivedMemories.length,
    contextChunks: archivedChunks.length,
    conversations: archivedConversations.length,
    decisions: archivedDecisions.length,
    usageRecords: archivedUsage.length,
    purchaseRecords: archivedPurchases.length,
    contextAccessLogs: archivedAccessLogs.length,
  };

  return {
    version: 1,
    exportId,
    exportedAt: exportedAt.toISOString(),
    orgId,
    mode,
    range: {
      startTime: toIso(startTime),
      endTime: toIso(endTime),
    },
    counts,
    datasets: {
      contextMemory: archivedMemories,
      contextChunks: archivedChunks,
      conversations: archivedConversations,
      decisions: archivedDecisions,
      usageRecords: archivedUsage,
      purchaseRecords: archivedPurchases,
      contextAccessLogs: archivedAccessLogs,
    },
  };
}

export async function restoreArchive(payload: ArchivePayload, orgId: string) {
  if (!payload || payload.version !== 1) {
    throw new Error('Unsupported archive format');
  }

  if (payload.orgId !== orgId) {
    throw new Error('Archive orgId does not match current session');
  }

  const datasets = payload.datasets || {
    contextMemory: [],
    contextChunks: [],
    conversations: [],
    decisions: [],
    usageRecords: [],
    purchaseRecords: [],
    contextAccessLogs: [],
  };

  const conversations = datasets.conversations || [];
  const contextMemory = datasets.contextMemory || [];
  const contextMemoryIdSet = new Set(contextMemory.map(item => item.id));
  const contextChunks = datasets.contextChunks || [];
  const decisions = datasets.decisions || [];
  const usageRecords = datasets.usageRecords || [];
  const purchaseRecords = datasets.purchaseRecords || [];
  const contextAccessLogs = datasets.contextAccessLogs || [];
  const conversationIdSet = new Set(conversations.map(item => item.id));

  const mismatched = [
    ...contextMemory.filter(item => item.orgId !== orgId),
    ...conversations.filter(item => item.orgId !== orgId),
    ...decisions.filter(item => item.orgId !== orgId),
    ...usageRecords.filter(item => item.orgId !== orgId),
    ...purchaseRecords.filter(item => item.orgId !== orgId),
    ...contextAccessLogs.filter(item => item.orgId !== orgId),
  ];

  if (mismatched.length) {
    throw new Error('Archive contains records for a different org');
  }

  if (conversations.length) {
    for (const batch of chunkArray(conversations, 500)) {
      await prisma.conversation.createMany({
        data: batch.map(item => ({
          id: item.id,
          userId: item.userId,
          orgId,
          title: item.title,
          summary: item.summary,
          agentId: item.agentId,
          agentName: item.agentName,
          messageCount: item.messageCount,
          tokenCount: item.tokenCount,
          cost: item.cost,
          tags: item.tags || [],
          createdAt: parseDate(item.createdAt) || new Date(),
          updatedAt: parseDate(item.updatedAt) || new Date(),
          lastMessageAt: parseDate(item.lastMessageAt),
          isArchived: item.isArchived,
          scope: item.scope,
        })),
        skipDuplicates: true,
      });
    }
  }

  const parentMap = new Map<string, string>();
  if (contextMemory.length) {
    for (const item of contextMemory) {
      if (item.parentId) {
        parentMap.set(item.id, item.parentId);
      }
    }

    for (const batch of chunkArray(contextMemory, 500)) {
      await prisma.contextMemory.createMany({
        data: batch.map(item => ({
          id: item.id,
          userId: item.userId,
          orgId,
          content: item.content,
          summary: item.summary,
          contentType: item.contentType,
          metadata: item.metadata || {},
          agentId: item.agentId,
          agentName: item.agentName,
          chunksComputed: item.chunksComputed,
          retention: item.retention,
          archivedAt: parseDate(item.archivedAt),
          archivedUrl: item.archivedUrl,
          starred: item.starred,
          upvoted: item.upvoted,
          importance: item.importance,
          conversationId: item.conversationId && conversationIdSet.has(item.conversationId)
            ? item.conversationId
            : null,
          parentId: null,
          correlationId: item.correlationId,
          createdAt: parseDate(item.createdAt) || new Date(),
          updatedAt: parseDate(item.updatedAt) || new Date(),
          expiresAt: parseDate(item.expiresAt),
          isArchived: item.isArchived,
          piiDetected: item.piiDetected,
          piiRedacted: item.piiRedacted,
          rawContent: item.rawContent,
          precheckDecision: item.precheckDecision,
          scope: item.scope,
          visibility: item.visibility,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (parentMap.size) {
    const parentIds = Array.from(new Set(parentMap.values()));
    const existingParents = await prisma.contextMemory.findMany({
      where: { id: { in: parentIds } },
      select: { id: true },
    });
    const existingParentSet = new Set(existingParents.map(item => item.id));

    for (const [childId, parentId] of parentMap.entries()) {
      if (!existingParentSet.has(parentId)) continue;
      await prisma.contextMemory.update({
        where: { id: childId },
        data: { parentId },
      });
    }
  }

  const chunksToInsert = contextChunks.filter(item => contextMemoryIdSet.has(item.contextMemoryId));
  if (chunksToInsert.length) {
    for (const batch of chunkArray(chunksToInsert, 500)) {
      await prisma.contextChunk.createMany({
        data: batch.map(item => ({
          id: item.id,
          contextMemoryId: item.contextMemoryId,
          chunkIndex: item.chunkIndex,
          content: item.content,
          tokenCount: item.tokenCount,
          createdAt: parseDate(item.createdAt) || new Date(),
        })),
        skipDuplicates: true,
      });
    }
  }

  if (decisions.length) {
    for (const batch of chunkArray(decisions, 500)) {
      await prisma.decision.createMany({
        data: batch.map(item => ({
          id: item.id,
          orgId,
          direction: item.direction,
          decision: item.decision,
          tool: item.tool,
          scope: item.scope,
          detectorSummary: item.detectorSummary || {},
          payloadHash: item.payloadHash,
          payloadOut: item.payloadOut ?? null,
          reasons: Array.isArray(item.reasons) ? item.reasons : [],
          policyId: item.policyId,
          latencyMs: item.latencyMs,
          correlationId: item.correlationId,
          tags: Array.isArray(item.tags) ? item.tags : [],
          ts: parseDate(item.ts) || new Date(),
        })),
        skipDuplicates: true,
      });
    }
  }

  if (usageRecords.length) {
    for (const batch of chunkArray(usageRecords, 500)) {
      await prisma.usageRecord.createMany({
        data: batch.map(item => ({
          id: item.id,
          userId: item.userId,
          orgId,
          provider: item.provider,
          model: item.model,
          inputTokens: item.inputTokens,
          outputTokens: item.outputTokens,
          cost: toDecimalString(item.cost),
          costType: item.costType,
          tool: item.tool,
          correlationId: item.correlationId,
          timestamp: parseDate(item.timestamp) || new Date(),
          metadata: item.metadata || {},
          apiKeyId: item.apiKeyId,
          providerId: item.providerId,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (purchaseRecords.length) {
    for (const batch of chunkArray(purchaseRecords, 500)) {
      await prisma.purchaseRecord.createMany({
        data: batch.map(item => ({
          id: item.id,
          userId: item.userId,
          orgId,
          tool: item.tool,
          amount: toDecimalString(item.amount),
          currency: item.currency,
          description: item.description,
          vendor: item.vendor,
          category: item.category,
          correlationId: item.correlationId,
          timestamp: parseDate(item.timestamp) || new Date(),
          metadata: item.metadata || {},
          apiKeyId: item.apiKeyId,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (contextAccessLogs.length) {
    for (const batch of chunkArray(contextAccessLogs, 500)) {
      await prisma.contextAccessLog.createMany({
        data: batch.map(item => ({
          id: item.id,
          contextId: item.contextId,
          userId: item.userId,
          orgId,
          accessType: item.accessType,
          query: item.query,
          resultsCount: item.resultsCount,
          createdAt: parseDate(item.createdAt) || new Date(),
        })),
        skipDuplicates: true,
      });
    }
  }

  const contextEmbeddings = contextMemory
    .filter(item => Array.isArray(item.embedding) && item.embedding.length)
    .map(item => ({
      id: item.id,
      embedding: item.embedding as number[],
    }));

  await setContextEmbeddings(contextEmbeddings);

  const chunkEmbeddings = chunksToInsert
    .filter(item => Array.isArray(item.embedding) && item.embedding.length)
    .map(item => ({
      id: item.id,
      embedding: item.embedding as number[],
    }));

  await setChunkEmbeddings(chunkEmbeddings);

  const contextsWithChunks = new Set(
    chunksToInsert.map(item => item.contextMemoryId)
  );
  const contextsWithEmbeddings = new Set(
    contextEmbeddings.map(item => item.id)
  );

  const hotIds = Array.from(contextsWithChunks);
  const warmIds = Array.from(contextsWithEmbeddings).filter(id => !contextsWithChunks.has(id));

  if (hotIds.length) {
    await prisma.contextMemory.updateMany({
      where: { id: { in: hotIds } },
      data: {
        retention: 'hot',
        chunksComputed: true,
        archivedAt: null,
        archivedUrl: null,
        isArchived: false,
      },
    });
  }

  if (warmIds.length) {
    await prisma.contextMemory.updateMany({
      where: { id: { in: warmIds } },
      data: {
        retention: 'warm',
        chunksComputed: false,
        archivedAt: null,
        archivedUrl: null,
        isArchived: false,
      },
    });
  }

  return {
    restored: {
      contextMemory: contextMemory.length,
      contextChunks: contextChunks.length,
      conversations: conversations.length,
      decisions: decisions.length,
      usageRecords: usageRecords.length,
      purchaseRecords: purchaseRecords.length,
      contextAccessLogs: contextAccessLogs.length,
    },
  };
}
