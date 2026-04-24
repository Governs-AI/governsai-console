import { prisma } from '@governs-ai/db';
import {
  buildComplianceReport,
  buildComplianceReportStatus,
  complianceReportToPdf,
} from '@/lib/services/compliance-report-service';

const mockPrisma = prisma as any;

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

  it('publishes status payloads with artifact URLs once the report is ready', () => {
    const payload = buildComplianceReportStatus({
      id: 'rpt_ready',
      orgId: 'org-1',
      requestedById: 'user-1',
      reportType: 'compliance_summary',
      source: 'on_demand',
      status: 'ready',
      startTime: new Date('2026-04-01T00:00:00.000Z'),
      endTime: new Date('2026-04-24T00:00:00.000Z'),
      generatedAt: new Date('2026-04-24T15:00:00.000Z'),
      completedAt: new Date('2026-04-24T15:00:01.000Z'),
      errorMessage: null,
      reportJson: null,
      pdfData: Buffer.from('%PDF-1.4'),
      createdAt: new Date('2026-04-24T14:59:00.000Z'),
      updatedAt: new Date('2026-04-24T15:00:01.000Z'),
    });

    expect(payload.report_id).toBe('rpt_ready');
    expect(payload.status).toBe('ready');
    expect(payload.download_url).toBe('/api/v1/reports/rpt_ready?download=1&format=pdf');
    expect(payload.artifacts).toEqual({
      pdf: '/api/v1/reports/rpt_ready?download=1&format=pdf',
      json: '/api/v1/reports/rpt_ready?download=1&format=json',
    });
  });
});
