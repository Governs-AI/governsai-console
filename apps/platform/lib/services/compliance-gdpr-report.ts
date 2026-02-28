import { randomUUID } from 'crypto';
import { Prisma, prisma } from '@governs-ai/db';

export interface GdprDataMapOptions {
  orgId: string;
  startTime?: Date;
  endTime?: Date;
  maxRecords?: number;
}

export interface GdprDataMapActivity {
  source: 'context_memory' | 'decision' | 'document' | 'document_chunk' | 'context_access';
  recordId: string;
  touchedAt: string;
  userId: string | null;
  correlationId: string | null;
  action: string;
  piiSignals: string[];
  metadata: Record<string, unknown>;
}

export interface GdprDataMapReport {
  version: number;
  reportType: 'gdpr_data_map';
  reportId: string;
  generatedAt: string;
  orgId: string;
  period: {
    startTime: string | null;
    endTime: string | null;
  };
  summary: {
    totalPiiTouches: number;
    bySource: Record<GdprDataMapActivity['source'], number>;
    uniqueUsersTouched: number;
    contextsWithPii: number;
    decisionsWithPii: number;
    documentsWithPii: number;
    documentChunksWithPii: number;
    piiAccessEvents: number;
  };
  activities: GdprDataMapActivity[];
}

type DateFilter = {
  gte?: Date;
  lte?: Date;
};

function buildDateFilter(startTime?: Date, endTime?: Date): DateFilter | undefined {
  const dateFilter: DateFilter = {};
  if (startTime) {
    dateFilter.gte = startTime;
  }
  if (endTime) {
    dateFilter.lte = endTime;
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toMetadata(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (isRecord(value)) {
    return value;
  }
  return { value };
}

function parseReasons(value: Prisma.JsonValue | null | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }
        if (isRecord(entry)) {
          const code = entry.code;
          return typeof code === 'string' ? code : JSON.stringify(entry);
        }
        return JSON.stringify(entry);
      })
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (isRecord(value)) {
    return [JSON.stringify(value)];
  }

  return [String(value)];
}

function extractPiiSignals(reasons: string[]): string[] {
  const signals = new Set<string>();

  for (const reason of reasons) {
    const lowered = reason.toLowerCase();
    if (!lowered.includes('pii') && !lowered.includes('hipaa') && !lowered.includes('pci')) {
      continue;
    }

    const suffix = reason.includes(':') ? reason.split(':').slice(1).join(':') : reason;
    signals.add(suffix || reason);
  }

  return Array.from(signals);
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function gdprDataMapToCsv(report: GdprDataMapReport): string {
  const header = [
    'report_id',
    'generated_at',
    'org_id',
    'period_start',
    'period_end',
    'source',
    'record_id',
    'touched_at',
    'user_id',
    'correlation_id',
    'action',
    'pii_signals',
    'metadata_json',
  ];

  const rows = report.activities.map((activity) => [
    report.reportId,
    report.generatedAt,
    report.orgId,
    report.period.startTime || '',
    report.period.endTime || '',
    activity.source,
    activity.recordId,
    activity.touchedAt,
    activity.userId || '',
    activity.correlationId || '',
    activity.action,
    activity.piiSignals.join('|'),
    JSON.stringify(activity.metadata),
  ]);

  const csvLines = [header, ...rows].map((cells) => cells.map((cell) => escapeCsvCell(String(cell))).join(','));
  return csvLines.join('\n');
}

export async function buildGdprDataMapReport(options: GdprDataMapOptions): Promise<GdprDataMapReport> {
  const maxRecords = Math.min(Math.max(options.maxRecords ?? 5000, 100), 20000);
  const dateFilter = buildDateFilter(options.startTime, options.endTime);

  const contextWhere: Prisma.ContextMemoryWhereInput = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    OR: [
      { piiDetected: true },
      { piiRedacted: true },
      { precheckDecision: { in: ['redact', 'deny', 'block'] } },
    ],
  };

  const decisionWhere: Prisma.DecisionWhereInput = {
    orgId: options.orgId,
    ...(dateFilter ? { ts: dateFilter } : {}),
  };

  const documentWhere: Prisma.DocumentWhereInput = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    OR: [{ piiDetected: true }, { piiRedacted: true }],
  };

  const documentChunkWhere: Prisma.DocumentChunkWhereInput = {
    document: { orgId: options.orgId },
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    OR: [{ piiDetected: true }, { piiRedacted: true }],
  };

  const accessWhere: Prisma.ContextAccessLogWhereInput = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    context: {
      is: {
        OR: [{ piiDetected: true }, { piiRedacted: true }],
      },
    },
  };

  const [contexts, decisions, documents, documentChunks, accessLogs] = await Promise.all([
    prisma.contextMemory.findMany({
      where: contextWhere,
      orderBy: { createdAt: 'desc' },
      take: maxRecords,
      select: {
        id: true,
        userId: true,
        createdAt: true,
        contentType: true,
        piiDetected: true,
        piiRedacted: true,
        precheckDecision: true,
        retention: true,
        scope: true,
        visibility: true,
        correlationId: true,
        metadata: true,
      },
    }),
    prisma.decision.findMany({
      where: decisionWhere,
      orderBy: { ts: 'desc' },
      take: maxRecords,
      select: {
        id: true,
        ts: true,
        decision: true,
        direction: true,
        tool: true,
        correlationId: true,
        policyId: true,
        reasons: true,
      },
    }),
    prisma.document.findMany({
      where: documentWhere,
      orderBy: { createdAt: 'desc' },
      take: maxRecords,
      select: {
        id: true,
        userId: true,
        createdAt: true,
        filename: true,
        contentType: true,
        status: true,
        piiDetected: true,
        piiRedacted: true,
        scope: true,
        visibility: true,
      },
    }),
    prisma.documentChunk.findMany({
      where: documentChunkWhere,
      orderBy: { createdAt: 'desc' },
      take: maxRecords,
      select: {
        id: true,
        documentId: true,
        createdAt: true,
        piiDetected: true,
        piiRedacted: true,
      },
    }),
    prisma.contextAccessLog.findMany({
      where: accessWhere,
      orderBy: { createdAt: 'desc' },
      take: maxRecords,
      select: {
        id: true,
        contextId: true,
        userId: true,
        createdAt: true,
        accessType: true,
        query: true,
        resultsCount: true,
        context: {
          select: {
            contentType: true,
            correlationId: true,
          },
        },
      },
    }),
  ]);

  const contextActivities: GdprDataMapActivity[] = contexts.map((item) => {
    const piiSignals = new Set<string>();
    if (item.piiDetected) piiSignals.add('pii_detected');
    if (item.piiRedacted) piiSignals.add('pii_redacted');
    if (item.precheckDecision) piiSignals.add(`precheck_${item.precheckDecision}`);

    return {
      source: 'context_memory',
      recordId: item.id,
      touchedAt: item.createdAt.toISOString(),
      userId: item.userId,
      correlationId: item.correlationId,
      action: 'context.persist',
      piiSignals: Array.from(piiSignals),
      metadata: {
        contentType: item.contentType,
        retention: item.retention,
        scope: item.scope,
        visibility: item.visibility,
        ...toMetadata(item.metadata),
      },
    };
  });

  const decisionActivities: GdprDataMapActivity[] = [];
  for (const item of decisions) {
    const reasons = parseReasons(item.reasons);
    const piiSignals = extractPiiSignals(reasons);
    if (piiSignals.length === 0) {
      continue;
    }

    decisionActivities.push({
      source: 'decision',
      recordId: item.id,
      touchedAt: item.ts.toISOString(),
      userId: null,
      correlationId: item.correlationId,
      action: `decision.${item.decision}`,
      piiSignals,
      metadata: {
        direction: item.direction,
        tool: item.tool,
        policyId: item.policyId,
        reasons,
      },
    });
  }

  const documentActivities: GdprDataMapActivity[] = documents.map((item) => {
    const piiSignals = new Set<string>();
    if (item.piiDetected) piiSignals.add('pii_detected');
    if (item.piiRedacted) piiSignals.add('pii_redacted');

    return {
      source: 'document',
      recordId: item.id,
      touchedAt: item.createdAt.toISOString(),
      userId: item.userId,
      correlationId: null,
      action: 'document.store',
      piiSignals: Array.from(piiSignals),
      metadata: {
        filename: item.filename,
        contentType: item.contentType,
        status: item.status,
        scope: item.scope,
        visibility: item.visibility,
      },
    };
  });

  const chunkActivities: GdprDataMapActivity[] = documentChunks.map((item) => {
    const piiSignals = new Set<string>();
    if (item.piiDetected) piiSignals.add('pii_detected');
    if (item.piiRedacted) piiSignals.add('pii_redacted');

    return {
      source: 'document_chunk',
      recordId: item.id,
      touchedAt: item.createdAt.toISOString(),
      userId: null,
      correlationId: null,
      action: 'document.chunk.persist',
      piiSignals: Array.from(piiSignals),
      metadata: {
        documentId: item.documentId,
      },
    };
  });

  const accessActivities: GdprDataMapActivity[] = accessLogs.map((item) => ({
    source: 'context_access',
    recordId: item.id,
    touchedAt: item.createdAt.toISOString(),
    userId: item.userId,
    correlationId: item.context?.correlationId || null,
    action: `context.${item.accessType}`,
    piiSignals: ['pii_accessed'],
    metadata: {
      contextId: item.contextId,
      contextType: item.context?.contentType || null,
      query: item.query,
      resultsCount: item.resultsCount,
    },
  }));

  const activities = [
    ...contextActivities,
    ...decisionActivities,
    ...documentActivities,
    ...chunkActivities,
    ...accessActivities,
  ].sort((a, b) => b.touchedAt.localeCompare(a.touchedAt));

  const bySource: Record<GdprDataMapActivity['source'], number> = {
    context_memory: contextActivities.length,
    decision: decisionActivities.length,
    document: documentActivities.length,
    document_chunk: chunkActivities.length,
    context_access: accessActivities.length,
  };

  const uniqueUsersTouched = new Set(
    activities
      .map((item) => item.userId)
      .filter((item): item is string => Boolean(item))
  ).size;

  return {
    version: 1,
    reportType: 'gdpr_data_map',
    reportId: randomUUID(),
    generatedAt: new Date().toISOString(),
    orgId: options.orgId,
    period: {
      startTime: options.startTime ? options.startTime.toISOString() : null,
      endTime: options.endTime ? options.endTime.toISOString() : null,
    },
    summary: {
      totalPiiTouches: activities.length,
      bySource,
      uniqueUsersTouched,
      contextsWithPii: contextActivities.length,
      decisionsWithPii: decisionActivities.length,
      documentsWithPii: documentActivities.length,
      documentChunksWithPii: chunkActivities.length,
      piiAccessEvents: accessActivities.length,
    },
    activities,
  };
}
