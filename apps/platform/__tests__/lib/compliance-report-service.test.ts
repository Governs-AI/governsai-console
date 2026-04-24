import { prisma } from '@governs-ai/db';
import {
  buildComplianceReport,
  buildComplianceReportStatus,
  complianceReportToPdf,
  countActiveComplianceReportJobs,
  ensureComplianceReportJobReady,
  findComplianceReportJob,
  processComplianceReportJob,
  STALE_PROCESSING_MS,
} from '@/lib/services/compliance-report-service';

const mockPrisma = prisma as any;

function baseRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'rpt_x',
    orgId: 'org-1',
    requestedById: 'user-1',
    reportType: 'compliance_summary',
    source: 'on_demand',
    status: 'pending',
    startTime: null,
    endTime: null,
    generatedAt: null,
    completedAt: null,
    errorMessage: null,
    errorCode: null,
    reportJson: null,
    pdfData: null,
    pdfBlobUrl: null,
    pdfBlobPath: null,
    containsPii: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('compliance-report-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the compliance report schema with the required governance summary fields', async () => {
    mockPrisma.decision.findMany.mockResolvedValue([
      {
        decision: 'allow',
        tool: 'model.chat',
        policyId: 'policy-a',
        reasons: ['safe'],
        latencyMs: 12,
        ts: new Date('2026-04-21T12:00:00.000Z'),
      },
      {
        decision: 'deny',
        tool: 'browser.search',
        policyId: 'policy-b',
        reasons: ['PII:email_address'],
        latencyMs: 24,
        ts: new Date('2026-04-21T12:05:00.000Z'),
      },
      {
        decision: 'transform',
        tool: 'model.chat',
        policyId: null,
        reasons: [{ code: 'PII:phone_number' }],
        latencyMs: 30,
        ts: new Date('2026-04-21T12:10:00.000Z'),
      },
    ]);
    mockPrisma.contextMemory.findMany.mockResolvedValue([
      {
        piiDetected: true,
        piiRedacted: false,
        precheckDecision: 'allow',
        createdAt: new Date('2026-04-21T11:55:00.000Z'),
      },
      {
        piiDetected: true,
        piiRedacted: true,
        precheckDecision: 'redact',
        createdAt: new Date('2026-04-21T11:56:00.000Z'),
      },
    ]);
    mockPrisma.budgetAlert.findMany.mockResolvedValue([
      {
        type: 'threshold_reached',
        message: 'Organization budget at 90%',
        createdAt: new Date('2026-04-21T12:15:00.000Z'),
      },
    ]);
    mockPrisma.budgetLimit.findMany.mockResolvedValue([
      {
        type: 'organization',
        userId: null,
        monthlyLimit: 50,
      },
    ]);
    mockPrisma.usageRecord.findMany.mockResolvedValue([
      { tool: 'model.chat', cost: 35 },
      { tool: 'browser.search', cost: 20 },
    ]);
    mockPrisma.purchaseRecord.findMany.mockResolvedValue([{ amount: 10 }]);
    mockPrisma.orgMembership.findMany
      .mockResolvedValueOnce([
        {
          userId: 'user-2',
          role: 'ADMIN',
          createdAt: new Date('2026-04-21T10:00:00.000Z'),
          user: { email: 'new-admin@example.com' },
        },
      ])
      .mockResolvedValueOnce([
        {
          userId: 'user-1',
          role: 'OWNER',
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
          user: { email: 'owner@example.com' },
        },
        {
          userId: 'user-2',
          role: 'ADMIN',
          createdAt: new Date('2026-04-21T10:00:00.000Z'),
          user: { email: 'new-admin@example.com' },
        },
      ]);
    mockPrisma.verificationToken.count.mockResolvedValue(2);

    const report = await buildComplianceReport({
      reportId: 'rpt_123',
      orgId: 'org-1',
      requestedById: 'user-1',
      startTime: new Date('2026-04-01T00:00:00.000Z'),
      endTime: new Date('2026-04-24T00:00:00.000Z'),
      source: 'on_demand',
    });

    expect(report.reportType).toBe('compliance_summary');
    expect(report.reportId).toBe('rpt_123');
    expect(report.summary).toEqual({
      policyDecisions: 3,
      piiEvents: 4,
      budgetOverruns: 1,
      userAccessChanges: 3,
      toolInvocations: 3,
    });
    expect(report.policyDecisions.byDecision).toEqual({
      allow: 1,
      deny: 1,
      transform: 1,
    });
    expect(report.piiEvents.uniqueSignals).toEqual(['email_address', 'phone_number']);
    expect(report.budget.overrunCount).toBe(1);
    expect(report.userAccess.roleDistribution).toEqual({
      OWNER: 1,
      ADMIN: 1,
    });
    expect(report.toolInvocations.topTools).toEqual([
      { tool: 'model.chat', count: 2, totalCost: 35 },
      { tool: 'browser.search', count: 1, totalCost: 20 },
    ]);
  });

  it('renders a non-empty PDF artifact for a ready report', async () => {
    const pdf = complianceReportToPdf({
      version: 1,
      reportType: 'compliance_summary',
      reportId: 'rpt_pdf',
      generatedAt: '2026-04-24T15:00:00.000Z',
      orgId: 'org-1',
      period: {
        startTime: '2026-04-01T00:00:00.000Z',
        endTime: '2026-04-24T00:00:00.000Z',
      },
      requestedBy: {
        userId: 'user-1',
        source: 'on_demand',
      },
      summary: {
        policyDecisions: 10,
        piiEvents: 3,
        budgetOverruns: 1,
        userAccessChanges: 2,
        toolInvocations: 8,
      },
      policyDecisions: {
        total: 10,
        byDecision: { allow: 8, deny: 2 },
        averageLatencyMs: 18,
        topTools: [{ tool: 'model.chat', count: 6 }],
        topPolicies: [{ policyId: 'policy-a', count: 5 }],
      },
      piiEvents: {
        total: 3,
        contextsDetected: 2,
        contextsRedacted: 1,
        decisionsFlagged: 1,
        uniqueSignals: ['email_address'],
        recentEvents: [],
      },
      budget: {
        overrunCount: 1,
        alertsTriggered: 1,
        totalUsageCost: 42.25,
        totalPurchaseAmount: 5,
        affectedBudgets: [
          {
            scope: 'organization',
            userId: null,
            monthlyLimit: 40,
            spendInPeriod: 47.25,
          },
        ],
      },
      userAccess: {
        totalMembers: 4,
        newMembers: 1,
        invitesSent: 1,
        roleDistribution: { OWNER: 1, ADMIN: 1, VIEWER: 2 },
        recentMembers: [],
      },
      toolInvocations: {
        total: 8,
        uniqueTools: 2,
        topTools: [{ tool: 'model.chat', count: 6, totalCost: 42.25 }],
      },
    });

    expect(pdf.byteLength).toBeGreaterThan(200);
    expect(pdf.toString('utf8', 0, 8)).toContain('%PDF-1.4');
  });

  it('scopes findComplianceReportJob lookups by orgId at the database boundary', async () => {
    mockPrisma.complianceReport.findFirst.mockResolvedValue(baseRow({ id: 'rpt_x' }));

    const result = await findComplianceReportJob('rpt_x', 'org-1');

    expect(result?.id).toBe('rpt_x');
    expect(mockPrisma.complianceReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'rpt_x', orgId: 'org-1' },
    });
  });

  it('counts only active (pending|processing) jobs per org for rate limiting', async () => {
    mockPrisma.complianceReport.count.mockResolvedValue(2);

    const total = await countActiveComplianceReportJobs('org-1');

    expect(total).toBe(2);
    expect(mockPrisma.complianceReport.count).toHaveBeenCalledWith({
      where: {
        orgId: 'org-1',
        status: { in: ['pending', 'processing'] },
      },
    });
  });

  it('processComplianceReportJob short-circuits when the atomic claim is lost (already processing)', async () => {
    mockPrisma.complianceReport.findUnique.mockResolvedValue(
      baseRow({ id: 'rpt_locked', status: 'processing' })
    );
    mockPrisma.complianceReport.updateMany.mockResolvedValue({ count: 0 });

    const result = await processComplianceReportJob('rpt_locked');

    expect(result.id).toBe('rpt_locked');
    expect(result.status).toBe('processing');
    // No build pipeline calls happen when the claim is lost.
    expect(mockPrisma.complianceReport.update).not.toHaveBeenCalled();
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });
  
  it('processComplianceReportJob reclaims stale processing rows older than the watchdog window', async () => {
    const jobRow = baseRow({ id: 'rpt_zombie', status: 'processing' });
    mockPrisma.complianceReport.findUnique.mockResolvedValue(jobRow);
    mockPrisma.complianceReport.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.complianceReport.update.mockResolvedValue({ ...jobRow, status: 'ready' });

    mockPrisma.decision.findMany.mockResolvedValue([]);
    mockPrisma.contextMemory.findMany.mockResolvedValue([]);
    mockPrisma.budgetAlert.findMany.mockResolvedValue([]);
    mockPrisma.budgetLimit.findMany.mockResolvedValue([]);
    mockPrisma.usageRecord.findMany.mockResolvedValue([]);
    mockPrisma.purchaseRecord.findMany.mockResolvedValue([]);
    mockPrisma.orgMembership.findMany.mockResolvedValue([]);
    mockPrisma.verificationToken.count.mockResolvedValue(0);

    const before = Date.now();
    await processComplianceReportJob('rpt_zombie');
    const after = Date.now();

    const call = mockPrisma.complianceReport.updateMany.mock.calls[0][0];
    const reclaimClause = call.where.OR.find(
      (clause: { status?: string }) => clause.status === 'processing'
    );
    expect(reclaimClause).toBeDefined();
    const cutoff = (reclaimClause.updatedAt as { lt: Date }).lt.getTime();
    expect(cutoff).toBeGreaterThanOrEqual(before - STALE_PROCESSING_MS - 50);
    expect(cutoff).toBeLessThanOrEqual(after - STALE_PROCESSING_MS + 50);
  });

  it('ensureComplianceReportJobReady self-heals pending jobs instead of leaving them stuck pending', async () => {
    const pendingJob = {
      id: 'rpt_pending',
      orgId: 'org-1',
      requestedById: 'user-1',
      reportType: 'compliance_summary',
      source: 'on_demand',
      status: 'pending',
      startTime: null,
      endTime: null,
      generatedAt: null,
      completedAt: null,
      errorMessage: null,
      reportJson: null,
      pdfData: null,
      createdAt: new Date('2026-04-24T15:00:00.000Z'),
      updatedAt: new Date('2026-04-24T15:00:00.000Z'),
    };
    const readyJob = {
      ...pendingJob,
      status: 'ready',
      generatedAt: new Date('2026-04-24T15:00:01.000Z'),
      completedAt: new Date('2026-04-24T15:00:02.000Z'),
      reportJson: { reportId: 'rpt_pending' },
      pdfData: Buffer.from('%PDF-1.4'),
      updatedAt: new Date('2026-04-24T15:00:02.000Z'),
    };

    mockPrisma.complianceReport.findFirst.mockResolvedValue(pendingJob);
    mockPrisma.complianceReport.findUnique.mockResolvedValue(pendingJob);
    mockPrisma.complianceReport.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.complianceReport.update.mockResolvedValue(readyJob);

    mockPrisma.decision.findMany.mockResolvedValue([]);
    mockPrisma.contextMemory.findMany.mockResolvedValue([]);
    mockPrisma.budgetAlert.findMany.mockResolvedValue([]);
    mockPrisma.budgetLimit.findMany.mockResolvedValue([]);
    mockPrisma.usageRecord.findMany.mockResolvedValue([]);
    mockPrisma.purchaseRecord.findMany.mockResolvedValue([]);
    mockPrisma.orgMembership.findMany.mockResolvedValue([]);
    mockPrisma.verificationToken.count.mockResolvedValue(0);

    const result = await ensureComplianceReportJobReady('rpt_pending', 'org-1');

    expect(result?.status).toBe('ready');
    expect(mockPrisma.complianceReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'rpt_pending', orgId: 'org-1' },
    });
    expect(mockPrisma.complianceReport.updateMany).toHaveBeenCalledWith({
      where: { id: 'rpt_pending', status: { in: ['pending', 'failed'] } },
      data: { status: 'processing', errorMessage: null },
    });
  });

  it('publishes status payloads with artifact URLs once the report is ready', () => {
    const payload = buildComplianceReportStatus(
      baseRow({
        id: 'rpt_ready',
        status: 'ready',
        startTime: new Date('2026-04-01T00:00:00.000Z'),
        endTime: new Date('2026-04-24T00:00:00.000Z'),
        generatedAt: new Date('2026-04-24T15:00:00.000Z'),
        completedAt: new Date('2026-04-24T15:00:01.000Z'),
        pdfData: Buffer.from('%PDF-1.4'),
        createdAt: new Date('2026-04-24T14:59:00.000Z'),
        updatedAt: new Date('2026-04-24T15:00:01.000Z'),
      }) as any
    );

    expect(payload.report_id).toBe('rpt_ready');
    expect(payload.status).toBe('ready');
    expect(payload.error_code).toBeNull();
    expect(payload.download_url).toBe('/api/v1/reports/rpt_ready?download=1&format=pdf');
    expect(payload.artifacts).toEqual({
      pdf: '/api/v1/reports/rpt_ready?download=1&format=pdf',
      json: '/api/v1/reports/rpt_ready?download=1&format=json',
    });
  });

  it('failed reports return a sanitized error_code and never leak the raw error_message', () => {
    const payload = buildComplianceReportStatus(
      baseRow({
        id: 'rpt_failed',
        status: 'failed',
        errorCode: 'generation_failed',
        errorMessage: 'connection to db at 10.0.0.1:5432 timed out — internal stack info',
      }) as any
    );

    expect(payload.status).toBe('failed');
    expect(payload.error_code).toBe('generation_failed');
    expect(JSON.stringify(payload)).not.toContain('10.0.0.1');
    expect(JSON.stringify(payload)).not.toContain('timed out');
    expect((payload as any).error).toBeUndefined();
  });

  it('failed reports without a stored error_code still surface a stable enum value', () => {
    const payload = buildComplianceReportStatus(
      baseRow({
        id: 'rpt_legacy_failed',
        status: 'failed',
        errorCode: null,
        errorMessage: 'something exploded',
      }) as any
    );

    expect(payload.status).toBe('failed');
    expect(payload.error_code).toBe('generation_failed');
  });
});
