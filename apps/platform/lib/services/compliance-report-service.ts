import { prisma, type Prisma } from '@governs-ai/db';

type PrismaTxClient = Prisma.TransactionClient;
type PrismaWriteClient = typeof prisma | PrismaTxClient;

export type ComplianceReportStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type ComplianceReportSource = 'on_demand' | 'scheduled';
export type ComplianceReportFormat = 'pdf' | 'json';

export interface ComplianceReportJobInput {
  orgId: string;
  requestedById?: string;
  startTime?: Date;
  endTime?: Date;
  source?: ComplianceReportSource;
}

export interface ComplianceReportJobRecord {
  id: string;
  orgId: string;
  requestedById: string | null;
  reportType: string;
  source: string;
  status: string;
  startTime: Date | null;
  endTime: Date | null;
  generatedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  reportJson: ComplianceSummaryReport | null;
  pdfData: Buffer | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceSummaryReport {
  version: number;
  reportType: 'compliance_summary';
  reportId: string;
  generatedAt: string;
  orgId: string;
  period: {
    startTime: string | null;
    endTime: string | null;
  };
  requestedBy: {
    userId: string | null;
    source: ComplianceReportSource;
  };
  summary: {
    policyDecisions: number;
    piiEvents: number;
    budgetOverruns: number;
    userAccessChanges: number;
    toolInvocations: number;
  };
  policyDecisions: {
    total: number;
    byDecision: Record<string, number>;
    averageLatencyMs: number;
    topTools: Array<{ tool: string; count: number }>;
    topPolicies: Array<{ policyId: string; count: number }>;
  };
  piiEvents: {
    total: number;
    contextsDetected: number;
    contextsRedacted: number;
    decisionsFlagged: number;
    uniqueSignals: string[];
    recentEvents: Array<{
      source: 'context_memory' | 'decision';
      timestamp: string;
      signal: string;
      action: string;
    }>;
  };
  budget: {
    overrunCount: number;
    alertsTriggered: number;
    totalUsageCost: number;
    totalPurchaseAmount: number;
    affectedBudgets: Array<{
      scope: 'organization' | 'user';
      userId: string | null;
      monthlyLimit: number;
      spendInPeriod: number;
    }>;
  };
  userAccess: {
    totalMembers: number;
    newMembers: number;
    invitesSent: number;
    roleDistribution: Record<string, number>;
    recentMembers: Array<{
      userId: string;
      email: string;
      role: string;
      joinedAt: string;
    }>;
  };
  toolInvocations: {
    total: number;
    uniqueTools: number;
    topTools: Array<{
      tool: string;
      count: number;
      totalCost: number;
    }>;
  };
}

export type ComplianceReportErrorCode = 'generation_failed';

export interface ComplianceReportStatusResponse {
  report_id: string;
  status: string;
  report_type: string;
  source: string;
  period: {
    start_time: string | null;
    end_time: string | null;
  };
  generated_at: string | null;
  created_at: string;
  updated_at: string;
  error_code: ComplianceReportErrorCode | null;
  download_url: string | null;
  artifacts: {
    pdf: string | null;
    json: string | null;
  };
}

interface DecisionRow {
  decision: string;
  tool: string | null;
  policyId: string | null;
  reasons: unknown;
  latencyMs: number | null;
  ts: Date;
}

interface ContextMemoryRow {
  piiDetected: boolean;
  piiRedacted: boolean;
  precheckDecision: string | null;
  createdAt: Date;
}

interface BudgetAlertRow {
  type: string;
  message: string;
  createdAt: Date;
}

interface BudgetLimitRow {
  type: string;
  userId: string | null;
  monthlyLimit: unknown;
}

interface UsageRecordRow {
  userId?: string | null;
  tool: string | null;
  cost: unknown;
}

interface PurchaseRecordRow {
  userId?: string | null;
  amount: unknown;
}

interface MembershipRow {
  userId: string;
  role: string;
  createdAt: Date;
  user: {
    email: string;
  };
}

const READY_STATUSES = new Set<ComplianceReportStatus>(['ready']);
const PII_HINTS = ['pii', 'pci', 'hipaa', 'email_address', 'phone_number', 'ssn'];

function toDateFilter(startTime?: Date, endTime?: Date): { gte?: Date; lte?: Date } | undefined {
  const filter: { gte?: Date; lte?: Date } = {};

  if (startTime) {
    filter.gte = startTime;
  }
  if (endTime) {
    filter.lte = endTime;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toNumberValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object' && 'toNumber' in value) {
    const toNumber = (value as { toNumber?: () => number }).toNumber;
    if (typeof toNumber === 'function') {
      const parsed = toNumber.call(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseReasonStrings(value: unknown): string[] {
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
          if (typeof entry.code === 'string') {
            return entry.code;
          }
          return JSON.stringify(entry);
        }

        return String(entry);
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
    if (!PII_HINTS.some((hint) => lowered.includes(hint))) {
      continue;
    }

    const signal = reason.includes(':') ? reason.split(':').slice(1).join(':') : reason;
    signals.add(signal || reason);
  }

  return Array.from(signals);
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] || 0) + 1;
}

function toSortedEntries(counts: Record<string, number>, keyName: 'tool' | 'policyId', limit = 5) {
  return Object.entries(counts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([key, count]) => ({ [keyName]: key, count })) as Array<{ [key: string]: string | number }>;
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

function buildPdfFromLines(lines: string[]): Buffer {
  const safeLines = lines.slice(0, 300);
  const startY = 780;
  const lineHeight = 14;

  const streamParts: string[] = ['BT', '/F1 10 Tf', `50 ${startY} Td`, `${lineHeight} TL`];
  for (let index = 0; index < safeLines.length; index += 1) {
    if (index > 0) {
      streamParts.push('T*');
    }
    streamParts.push(`(${escapePdfText(safeLines[index])}) Tj`);
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
    pdfBody += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdfBody += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdfBody += `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdfBody, 'utf8');
}

function buildDownloadUrls(reportId: string): { pdf: string; json: string } {
  return {
    pdf: `/api/v1/reports/${reportId}?download=1&format=pdf`,
    json: `/api/v1/reports/${reportId}?download=1&format=json`,
  };
}

function formatCurrency(value: number): string {
  return value.toFixed(2);
}

function toJobRecord(value: unknown): ComplianceReportJobRecord | null {
  if (!value || !isRecord(value)) {
    return null;
  }

  return value as unknown as ComplianceReportJobRecord;
}

export async function createComplianceReportJob(
  input: ComplianceReportJobInput,
  client: PrismaWriteClient = prisma
): Promise<ComplianceReportJobRecord> {
  const created = await client.complianceReport.create({
    data: {
      orgId: input.orgId,
      requestedById: input.requestedById || null,
      reportType: 'compliance_summary',
      source: input.source || 'on_demand',
      status: 'pending',
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });

  return created as unknown as ComplianceReportJobRecord;
}

export async function countActiveComplianceReportJobs(
  orgId: string
): Promise<number> {
  return prisma.complianceReport.count({
    where: {
      orgId,
      status: { in: ['pending', 'processing'] },
    },
  });
}

export async function findComplianceReportJob(
  reportId: string,
  orgId: string
): Promise<ComplianceReportJobRecord | null> {
  const report = await prisma.complianceReport.findFirst({
    where: { id: reportId, orgId },
  });

  return toJobRecord(report);
}

export async function processComplianceReportJob(
  reportId: string
): Promise<ComplianceReportJobRecord> {
  const report = await prisma.complianceReport.findUnique({
    where: { id: reportId },
  });

  const existing = toJobRecord(report);
  if (!existing) {
    throw new Error('Compliance report not found');
  }

  if (
    existing.status === 'ready' &&
    existing.reportJson &&
    existing.pdfData
  ) {
    return existing;
  }

  // Atomic claim: only the call that flips pending|failed -> processing proceeds.
  // Concurrent callers see count === 0 and short-circuit to the existing row.
  const claim = await prisma.complianceReport.updateMany({
    where: {
      id: reportId,
      status: { in: ['pending', 'failed'] },
    },
    data: {
      status: 'processing',
      errorMessage: null,
    },
  });

  if (claim.count === 0) {
    return existing;
  }

  try {
    const reportJson = await buildComplianceReport({
      reportId: existing.id,
      orgId: existing.orgId,
      requestedById: existing.requestedById || undefined,
      startTime: existing.startTime || undefined,
      endTime: existing.endTime || undefined,
      source: (existing.source as ComplianceReportSource) || 'on_demand',
    });

    const pdfData = complianceReportToPdf(reportJson);
    const updated = await prisma.complianceReport.update({
      where: { id: reportId },
      data: {
        status: 'ready',
        generatedAt: new Date(reportJson.generatedAt),
        completedAt: new Date(),
        errorMessage: null,
        reportJson: reportJson as unknown as Prisma.InputJsonValue,
        pdfData,
      },
    });

    return updated as unknown as ComplianceReportJobRecord;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Compliance report generation failed:', error);
    const failed = await prisma.complianceReport.update({
      where: { id: reportId },
      data: {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    return failed as unknown as ComplianceReportJobRecord;
  }
}

export async function ensureComplianceReportJobReady(
  reportId: string,
  orgId: string
): Promise<ComplianceReportJobRecord | null> {
  const existing = await findComplianceReportJob(reportId, orgId);
  if (!existing) {
    return null;
  }

  if (READY_STATUSES.has(existing.status as ComplianceReportStatus)) {
    return existing;
  }

  if (existing.status === 'processing') {
    // Another worker holds the claim; let the caller poll again.
    return existing;
  }

  if (existing.status === 'failed') {
    return existing;
  }

  return processComplianceReportJob(reportId);
}

function toClientErrorCode(
  status: string
): ComplianceReportErrorCode | null {
  return status === 'failed' ? 'generation_failed' : null;
}

export function buildComplianceReportStatus(
  report: ComplianceReportJobRecord
): ComplianceReportStatusResponse {
  const artifacts = report.status === 'ready' ? buildDownloadUrls(report.id) : { pdf: null, json: null };

  return {
    report_id: report.id,
    status: report.status,
    report_type: report.reportType,
    source: report.source,
    period: {
      start_time: toIso(report.startTime),
      end_time: toIso(report.endTime),
    },
    generated_at: toIso(report.generatedAt),
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
    error_code: toClientErrorCode(report.status),
    download_url: artifacts.pdf,
    artifacts,
  };
}

export function getComplianceReportDownload(
  report: ComplianceReportJobRecord,
  format: ComplianceReportFormat
): {
  body: Buffer | string;
  contentType: string;
  filename: string;
} {
  if (report.status !== 'ready') {
    throw new Error('Report is not ready for download');
  }

  const safeTimestamp = (toIso(report.generatedAt) || report.createdAt.toISOString()).replace(/[:.]/g, '-');

  if (format === 'json') {
    if (!report.reportJson) {
      throw new Error('JSON artifact is missing');
    }

    return {
      body: JSON.stringify(report.reportJson, null, 2),
      contentType: 'application/json; charset=utf-8',
      filename: `compliance-report-${report.orgId}-${safeTimestamp}.json`,
    };
  }

  if (!report.pdfData) {
    throw new Error('PDF artifact is missing');
  }

  return {
    body: report.pdfData,
    contentType: 'application/pdf',
    filename: `compliance-report-${report.orgId}-${safeTimestamp}.pdf`,
  };
}

export function complianceReportToPdf(report: ComplianceSummaryReport): Buffer {
  const lines: string[] = [
    'GovernsAI Compliance Summary Report',
    `Report ID: ${report.reportId}`,
    `Generated: ${report.generatedAt}`,
    `Organization: ${report.orgId}`,
    `Period: ${report.period.startTime || 'N/A'} to ${report.period.endTime || 'N/A'}`,
    `Requested by: ${report.requestedBy.userId || 'system'} (${report.requestedBy.source})`,
    '---',
    `Policy decisions: ${report.summary.policyDecisions}`,
    `PII events: ${report.summary.piiEvents}`,
    `Budget overruns: ${report.summary.budgetOverruns}`,
    `User access changes: ${report.summary.userAccessChanges}`,
    `Tool invocations: ${report.summary.toolInvocations}`,
    '---',
    `Average decision latency (ms): ${report.policyDecisions.averageLatencyMs}`,
    `Top decision tools: ${report.policyDecisions.topTools.map((item) => `${item.tool} (${item.count})`).join(', ') || 'none'}`,
    `PII signals: ${report.piiEvents.uniqueSignals.join(', ') || 'none'}`,
    `Budget alerts triggered: ${report.budget.alertsTriggered}`,
    `Usage cost: $${formatCurrency(report.budget.totalUsageCost)}`,
    `Purchase cost: $${formatCurrency(report.budget.totalPurchaseAmount)}`,
    `Current members: ${report.userAccess.totalMembers}`,
    `Invites sent: ${report.userAccess.invitesSent}`,
    `Role distribution: ${Object.entries(report.userAccess.roleDistribution)
      .map(([role, count]) => `${role}:${count}`)
      .join(', ') || 'none'}`,
  ];

  return buildPdfFromLines(lines);
}

export async function buildComplianceReport(options: {
  reportId: string;
  orgId: string;
  requestedById?: string;
  startTime?: Date;
  endTime?: Date;
  source?: ComplianceReportSource;
}): Promise<ComplianceSummaryReport> {
  const dateFilter = toDateFilter(options.startTime, options.endTime);

  const decisionWhere = {
    orgId: options.orgId,
    ...(dateFilter ? { ts: dateFilter } : {}),
  };
  const contextWhere = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    OR: [{ piiDetected: true }, { piiRedacted: true }],
  };
  const usageWhere = {
    orgId: options.orgId,
    ...(dateFilter ? { timestamp: dateFilter } : {}),
  };
  const purchaseWhere = {
    orgId: options.orgId,
    ...(dateFilter ? { timestamp: dateFilter } : {}),
  };
  const budgetAlertWhere = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };
  const membershipWhere = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };
  const inviteWhere = {
    orgId: options.orgId,
    purpose: 'invite',
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const [
    rawDecisions,
    rawContexts,
    rawBudgetAlerts,
    rawBudgetLimits,
    rawUsageRecords,
    rawPurchaseRecords,
    rawMembershipsInWindow,
    rawCurrentMemberships,
    inviteCount,
  ] = await Promise.all([
    prisma.decision.findMany({
      where: decisionWhere,
      select: {
        decision: true,
        tool: true,
        policyId: true,
        reasons: true,
        latencyMs: true,
        ts: true,
      },
      orderBy: { ts: 'desc' },
    }),
    prisma.contextMemory.findMany({
      where: contextWhere,
      select: {
        piiDetected: true,
        piiRedacted: true,
        precheckDecision: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.budgetAlert.findMany({
      where: budgetAlertWhere,
      select: {
        type: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.budgetLimit.findMany({
      where: {
        orgId: options.orgId,
        isActive: true,
      },
      select: {
        type: true,
        userId: true,
        monthlyLimit: true,
      },
    }),
    prisma.usageRecord.findMany({
      where: usageWhere,
      select: {
        userId: true,
        tool: true,
        cost: true,
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.purchaseRecord.findMany({
      where: purchaseWhere,
      select: {
        userId: true,
        amount: true,
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.orgMembership.findMany({
      where: membershipWhere,
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.orgMembership.findMany({
      where: {
        orgId: options.orgId,
      },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.verificationToken.count({
      where: inviteWhere,
    }),
  ]);

  const decisions = rawDecisions as unknown as DecisionRow[];
  const contexts = rawContexts as unknown as ContextMemoryRow[];
  const budgetAlerts = rawBudgetAlerts as unknown as BudgetAlertRow[];
  const budgetLimits = rawBudgetLimits as unknown as BudgetLimitRow[];
  const usageRecords = rawUsageRecords as unknown as UsageRecordRow[];
  const purchaseRecords = rawPurchaseRecords as unknown as PurchaseRecordRow[];
  const membershipsInWindow = rawMembershipsInWindow as unknown as MembershipRow[];
  const currentMemberships = rawCurrentMemberships as unknown as MembershipRow[];

  const byDecision: Record<string, number> = {};
  const toolCounts: Record<string, number> = {};
  const policyCounts: Record<string, number> = {};
  let totalLatency = 0;
  let latencySamples = 0;
  const recentPiiEvents: ComplianceSummaryReport['piiEvents']['recentEvents'] = [];
  const piiSignals = new Set<string>();
  let piiDecisionEvents = 0;

  for (const decision of decisions) {
    incrementCount(byDecision, decision.decision);

    if (decision.tool) {
      incrementCount(toolCounts, decision.tool);
    }

    incrementCount(policyCounts, decision.policyId || 'unassigned');

    if (typeof decision.latencyMs === 'number' && Number.isFinite(decision.latencyMs)) {
      totalLatency += decision.latencyMs;
      latencySamples += 1;
    }

    const reasons = parseReasonStrings(decision.reasons);
    const decisionSignals = extractPiiSignals(reasons);
    if (decisionSignals.length > 0) {
      piiDecisionEvents += 1;
      for (const signal of decisionSignals) {
        piiSignals.add(signal);
        if (recentPiiEvents.length < 10) {
          recentPiiEvents.push({
            source: 'decision',
            timestamp: decision.ts.toISOString(),
            signal,
            action: decision.decision,
          });
        }
      }
    }
  }

  let contextsDetected = 0;
  let contextsRedacted = 0;
  for (const context of contexts) {
    if (context.piiDetected) {
      contextsDetected += 1;
      if (recentPiiEvents.length < 10) {
        recentPiiEvents.push({
          source: 'context_memory',
          timestamp: context.createdAt.toISOString(),
          signal: context.piiRedacted ? 'pii_redacted' : 'pii_detected',
          action: context.precheckDecision || 'stored',
        });
      }
    }
    if (context.piiRedacted) {
      contextsRedacted += 1;
    }
  }

  const usageByTool = new Map<string, { count: number; totalCost: number }>();
  for (const usage of usageRecords) {
    const tool = usage.tool || 'unknown';
    const current = usageByTool.get(tool) || { count: 0, totalCost: 0 };
    current.count += 1;
    current.totalCost += toNumberValue(usage.cost);
    usageByTool.set(tool, current);
  }

  const totalUsageCost = usageRecords.reduce((sum, item) => sum + toNumberValue(item.cost), 0);
  const totalPurchaseAmount = purchaseRecords.reduce((sum, item) => sum + toNumberValue(item.amount), 0);

  const overrunBudgets = budgetLimits
    .map((limit) => {
      const spendInPeriod =
        limit.type === 'user' && limit.userId
          ? usageRecords
              .filter((record) => record.userId === limit.userId)
              .reduce((sum, record) => sum + toNumberValue(record.cost), 0) +
            purchaseRecords
              .filter((record) => record.userId === limit.userId)
              .reduce((sum, record) => sum + toNumberValue(record.amount), 0)
          : totalUsageCost + totalPurchaseAmount;

      return {
        scope: (limit.type === 'user' ? 'user' : 'organization') as 'organization' | 'user',
        userId: limit.userId,
        monthlyLimit: toNumberValue(limit.monthlyLimit),
        spendInPeriod,
      };
    })
    .filter((limit) => limit.monthlyLimit > 0 && limit.spendInPeriod > limit.monthlyLimit);

  const roleDistribution: Record<string, number> = {};
  for (const membership of currentMemberships) {
    incrementCount(roleDistribution, membership.role);
  }

  const recentMembers = membershipsInWindow.slice(0, 10).map((membership) => ({
    userId: membership.userId,
    email: membership.user.email,
    role: membership.role,
    joinedAt: membership.createdAt.toISOString(),
  }));

  const topTools = Object.entries(toolCounts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 5)
    .map(([tool, count]) => ({
      tool,
      count,
      totalCost: usageByTool.get(tool)?.totalCost || 0,
    }));

  return {
    version: 1,
    reportType: 'compliance_summary',
    reportId: options.reportId,
    generatedAt: new Date().toISOString(),
    orgId: options.orgId,
    period: {
      startTime: toIso(options.startTime),
      endTime: toIso(options.endTime),
    },
    requestedBy: {
      userId: options.requestedById || null,
      source: options.source || 'on_demand',
    },
    summary: {
      policyDecisions: decisions.length,
      piiEvents: contextsDetected + piiDecisionEvents,
      budgetOverruns: overrunBudgets.length,
      userAccessChanges: membershipsInWindow.length + Number(inviteCount || 0),
      toolInvocations: decisions.filter((decision) => Boolean(decision.tool)).length,
    },
    policyDecisions: {
      total: decisions.length,
      byDecision,
      averageLatencyMs: latencySamples > 0 ? Math.round(totalLatency / latencySamples) : 0,
      topTools: toSortedEntries(toolCounts, 'tool') as Array<{ tool: string; count: number }>,
      topPolicies: toSortedEntries(policyCounts, 'policyId') as Array<{ policyId: string; count: number }>,
    },
    piiEvents: {
      total: contextsDetected + piiDecisionEvents,
      contextsDetected,
      contextsRedacted,
      decisionsFlagged: piiDecisionEvents,
      uniqueSignals: Array.from(piiSignals).sort((left, right) => left.localeCompare(right)),
      recentEvents: recentPiiEvents,
    },
    budget: {
      overrunCount: overrunBudgets.length,
      alertsTriggered: budgetAlerts.length,
      totalUsageCost,
      totalPurchaseAmount,
      affectedBudgets: overrunBudgets,
    },
    userAccess: {
      totalMembers: currentMemberships.length,
      newMembers: membershipsInWindow.length,
      invitesSent: Number(inviteCount || 0),
      roleDistribution,
      recentMembers,
    },
    toolInvocations: {
      total: decisions.filter((decision) => Boolean(decision.tool)).length,
      uniqueTools: Object.keys(toolCounts).length,
      topTools,
    },
  };
}
