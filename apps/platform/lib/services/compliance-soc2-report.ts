import { randomUUID } from 'crypto';
import { Prisma, prisma } from '@governs-ai/db';

export interface Soc2EvidenceOptions {
  orgId: string;
  startTime?: Date;
  endTime?: Date;
  maxRecords?: number;
}

export type Soc2Severity = 'low' | 'medium' | 'high';

export interface Soc2EvidenceEvent {
  source: 'audit_log' | 'decision';
  eventId: string;
  timestamp: string;
  action: string;
  resource: string;
  actorId: string | null;
  actorEmail: string | null;
  correlationId: string | null;
  severity: Soc2Severity;
  details: Record<string, unknown>;
}

export interface Soc2EvidenceReport {
  version: number;
  reportType: 'soc2_evidence';
  reportId: string;
  generatedAt: string;
  orgId: string;
  period: {
    startTime: string | null;
    endTime: string | null;
  };
  summary: {
    totalEvents: number;
    auditEvents: number;
    decisionEvents: number;
    uniqueActors: number;
    bySeverity: Record<Soc2Severity, number>;
    topActions: Array<{ action: string; count: number }>;
  };
  events: Soc2EvidenceEvent[];
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
          return JSON.stringify(entry);
        }
        return String(entry);
      })
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (isRecord(value)) {
    return [JSON.stringify(value)];
  }

  return [String(value)];
}

function classifySeverity(action: string, details: Record<string, unknown>): Soc2Severity {
  const lowered = action.toLowerCase();
  const detailsText = JSON.stringify(details).toLowerCase();

  if (
    lowered.includes('delete') ||
    lowered.includes('revoke') ||
    lowered.includes('deny') ||
    lowered.includes('block') ||
    lowered.includes('failed') ||
    detailsText.includes('error')
  ) {
    return 'high';
  }

  if (
    lowered.includes('update') ||
    lowered.includes('create') ||
    lowered.includes('transform') ||
    lowered.includes('archive') ||
    lowered.includes('restore')
  ) {
    return 'medium';
  }

  return 'low';
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function soc2EvidenceToCsv(report: Soc2EvidenceReport): string {
  const header = [
    'report_id',
    'generated_at',
    'org_id',
    'period_start',
    'period_end',
    'source',
    'event_id',
    'timestamp',
    'action',
    'resource',
    'actor_id',
    'actor_email',
    'correlation_id',
    'severity',
    'details_json',
  ];

  const rows = report.events.map((event) => [
    report.reportId,
    report.generatedAt,
    report.orgId,
    report.period.startTime || '',
    report.period.endTime || '',
    event.source,
    event.eventId,
    event.timestamp,
    event.action,
    event.resource,
    event.actorId || '',
    event.actorEmail || '',
    event.correlationId || '',
    event.severity,
    JSON.stringify(event.details),
  ]);

  return [header, ...rows]
    .map((cells) => cells.map((cell) => escapeCsvCell(String(cell))).join(','))
    .join('\n');
}

function truncateForPdf(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(maxChars - 3, 1))}...`;
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

function buildPdfFromLines(lines: string[]): Buffer {
  const textLines = lines.slice(0, 400);
  const startY = 780;
  const lineHeight = 14;

  const streamParts: string[] = ['BT', '/F1 10 Tf', `50 ${startY} Td`, `${lineHeight} TL`];
  for (let index = 0; index < textLines.length; index += 1) {
    const line = escapePdfText(textLines[index]);
    if (index > 0) {
      streamParts.push('T*');
    }
    streamParts.push(`(${line}) Tj`);
  }
  streamParts.push('ET');

  const contentStream = streamParts.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdfBody = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdfBody, 'utf8'));
    pdfBody += object;
  }

  const xrefStart = Buffer.byteLength(pdfBody, 'utf8');
  pdfBody += `xref\n0 ${objects.length + 1}\n`;
  pdfBody += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    const offset = String(offsets[index]).padStart(10, '0');
    pdfBody += `${offset} 00000 n \n`;
  }

  pdfBody += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdfBody += `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdfBody, 'utf8');
}

export function soc2EvidenceToPdf(report: Soc2EvidenceReport): Buffer {
  const lines: string[] = [
    'GovernsAI SOC 2 Evidence Export',
    `Report ID: ${report.reportId}`,
    `Generated: ${report.generatedAt}`,
    `Organization: ${report.orgId}`,
    `Period: ${report.period.startTime || 'N/A'} to ${report.period.endTime || 'N/A'}`,
    `Total events: ${report.summary.totalEvents}`,
    `Audit events: ${report.summary.auditEvents}`,
    `Decision events: ${report.summary.decisionEvents}`,
    `Unique actors: ${report.summary.uniqueActors}`,
    `Severity (low/medium/high): ${report.summary.bySeverity.low}/${report.summary.bySeverity.medium}/${report.summary.bySeverity.high}`,
    '---',
    'Event Timeline',
  ];

  for (const event of report.events.slice(0, 250)) {
    const summary = `${event.timestamp} | ${event.severity.toUpperCase()} | ${event.action} | ${event.resource} | actor=${event.actorEmail || event.actorId || 'n/a'} | corr=${event.correlationId || 'n/a'}`;
    lines.push(truncateForPdf(summary, 108));
  }

  if (report.events.length > 250) {
    lines.push(`... truncated ${report.events.length - 250} additional events`);
  }

  return buildPdfFromLines(lines);
}

export async function buildSoc2EvidenceReport(options: Soc2EvidenceOptions): Promise<Soc2EvidenceReport> {
  const maxRecords = Math.min(Math.max(options.maxRecords ?? 5000, 100), 20000);
  const dateFilter = buildDateFilter(options.startTime, options.endTime);

  const auditWhere: Prisma.AuditLogWhereInput = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const decisionWhere: Prisma.DecisionWhereInput = {
    orgId: options.orgId,
    ...(dateFilter ? { ts: dateFilter } : {}),
  };

  const [auditLogs, decisions] = await Promise.all([
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: 'desc' },
      take: maxRecords,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
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
        scope: true,
        correlationId: true,
        policyId: true,
        reasons: true,
      },
    }),
  ]);

  const auditEvents: Soc2EvidenceEvent[] = auditLogs.map((item) => {
    const details = toMetadata(item.details);
    const severity = classifySeverity(item.action, details);

    return {
      source: 'audit_log',
      eventId: item.id,
      timestamp: item.createdAt.toISOString(),
      action: item.action,
      resource: item.resource,
      actorId: item.userId,
      actorEmail: item.user?.email || null,
      correlationId: null,
      severity,
      details,
    };
  });

  const decisionEvents: Soc2EvidenceEvent[] = decisions.map((item) => {
    const reasons = parseReasons(item.reasons);
    const details: Record<string, unknown> = {
      direction: item.direction,
      tool: item.tool,
      scope: item.scope,
      policyId: item.policyId,
      reasons,
    };

    return {
      source: 'decision',
      eventId: item.id,
      timestamp: item.ts.toISOString(),
      action: `decision.${item.decision}`,
      resource: 'precheck',
      actorId: null,
      actorEmail: null,
      correlationId: item.correlationId,
      severity: classifySeverity(item.decision, details),
      details,
    };
  });

  const events = [...auditEvents, ...decisionEvents].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp)
  );

  const severityCounts: Record<Soc2Severity, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  const actionCounts = new Map<string, number>();
  const actorSet = new Set<string>();

  for (const event of events) {
    severityCounts[event.severity] += 1;
    actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);

    if (event.actorId) {
      actorSet.add(event.actorId);
    } else if (event.actorEmail) {
      actorSet.add(event.actorEmail);
    }
  }

  const topActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([action, count]) => ({ action, count }));

  return {
    version: 1,
    reportType: 'soc2_evidence',
    reportId: randomUUID(),
    generatedAt: new Date().toISOString(),
    orgId: options.orgId,
    period: {
      startTime: options.startTime ? options.startTime.toISOString() : null,
      endTime: options.endTime ? options.endTime.toISOString() : null,
    },
    summary: {
      totalEvents: events.length,
      auditEvents: auditEvents.length,
      decisionEvents: decisionEvents.length,
      uniqueActors: actorSet.size,
      bySeverity: severityCounts,
      topActions,
    },
    events,
  };
}
