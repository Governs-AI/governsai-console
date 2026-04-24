import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/services/compliance-report-service', () => ({
  buildComplianceReportStatus: jest.fn(),
  createComplianceReportJob: jest.fn(),
  ensureComplianceReportJobReady: jest.fn(),
  findComplianceReportJob: jest.fn(),
  getComplianceReportDownload: jest.fn(),
  queueComplianceReportJob: jest.fn(),
}));

import { POST } from '@/app/api/v1/reports/generate/route';
import { GET } from '@/app/api/v1/reports/[id]/route';
import {
  buildComplianceReportStatus,
  createComplianceReportJob,
  ensureComplianceReportJobReady,
  findComplianceReportJob,
  getComplianceReportDownload,
  queueComplianceReportJob,
} from '@/lib/services/compliance-report-service';

const mockPrisma = prisma as any;
const mockBuildStatus = buildComplianceReportStatus as jest.Mock;
const mockCreateJob = createComplianceReportJob as jest.Mock;
const mockEnsureReady = ensureComplianceReportJobReady as jest.Mock;
const mockFindJob = findComplianceReportJob as jest.Mock;
const mockGetDownload = getComplianceReportDownload as jest.Mock;
const mockQueueJob = queueComplianceReportJob as jest.Mock;

function makeToken() {
  return jwt.sign(
    {
      sub: 'user-1',
      orgId: 'org-1',
      roles: ['OWNER'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    process.env.JWT_SECRET!
  );
}

describe('reports API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pending report job and returns the async contract', async () => {
    mockCreateJob.mockResolvedValue({
      id: 'rpt_pending',
      orgId: 'org-1',
      requestedById: 'user-1',
      reportType: 'compliance_summary',
      source: 'on_demand',
      status: 'pending',
      startTime: new Date('2026-04-01T00:00:00.000Z'),
      endTime: new Date('2026-04-24T00:00:00.000Z'),
      generatedAt: null,
      completedAt: null,
      errorMessage: null,
      reportJson: null,
      pdfData: null,
      createdAt: new Date('2026-04-24T15:00:00.000Z'),
      updatedAt: new Date('2026-04-24T15:00:00.000Z'),
    });
    mockBuildStatus.mockReturnValue({
      report_id: 'rpt_pending',
      status: 'pending',
      report_type: 'compliance_summary',
      source: 'on_demand',
      period: {
        start_time: '2026-04-01T00:00:00.000Z',
        end_time: '2026-04-24T00:00:00.000Z',
      },
      generated_at: null,
      created_at: '2026-04-24T15:00:00.000Z',
      updated_at: '2026-04-24T15:00:00.000Z',
      error: null,
      download_url: null,
      artifacts: {
        pdf: null,
        json: null,
      },
    });

    const req = new NextRequest('http://localhost/api/v1/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        startTime: '2026-04-01T00:00:00.000Z',
        endTime: '2026-04-24T00:00:00.000Z',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${makeToken()}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body).toMatchObject({
      report_id: 'rpt_pending',
      status: 'pending',
      status_url: '/api/v1/reports/rpt_pending',
      download_url: null,
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'compliance.report.generate.requested',
          orgId: 'org-1',
          userId: 'user-1',
        }),
      })
    );
    expect(mockQueueJob).toHaveBeenCalledWith('rpt_pending');
  });

  it('returns report status payloads with artifact URLs', async () => {
    mockFindJob.mockResolvedValue({
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
      reportJson: { ok: true },
      pdfData: Buffer.from('%PDF-1.4'),
      createdAt: new Date('2026-04-24T15:00:00.000Z'),
      updatedAt: new Date('2026-04-24T15:00:01.000Z'),
    });
    mockBuildStatus.mockReturnValue({
      report_id: 'rpt_ready',
      status: 'ready',
      report_type: 'compliance_summary',
      source: 'on_demand',
      period: {
        start_time: '2026-04-01T00:00:00.000Z',
        end_time: '2026-04-24T00:00:00.000Z',
      },
      generated_at: '2026-04-24T15:00:00.000Z',
      created_at: '2026-04-24T15:00:00.000Z',
      updated_at: '2026-04-24T15:00:01.000Z',
      error: null,
      download_url: '/api/v1/reports/rpt_ready?download=1&format=pdf',
      artifacts: {
        pdf: '/api/v1/reports/rpt_ready?download=1&format=pdf',
        json: '/api/v1/reports/rpt_ready?download=1&format=json',
      },
    });

    const req = new NextRequest('http://localhost/api/v1/reports/rpt_ready', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${makeToken()}`,
      },
    });

    const res = await GET(req, { params: Promise.resolve({ id: 'rpt_ready' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      report_id: 'rpt_ready',
      status: 'ready',
      download_url: '/api/v1/reports/rpt_ready?download=1&format=pdf',
      artifacts: {
        json: '/api/v1/reports/rpt_ready?download=1&format=json',
      },
    });
  });

  it('downloads the generated JSON artifact once the job is ready', async () => {
    mockEnsureReady.mockResolvedValue({
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
      reportJson: { ok: true },
      pdfData: Buffer.from('%PDF-1.4'),
      createdAt: new Date('2026-04-24T15:00:00.000Z'),
      updatedAt: new Date('2026-04-24T15:00:01.000Z'),
    });
    mockGetDownload.mockReturnValue({
      body: JSON.stringify({ ok: true }),
      contentType: 'application/json; charset=utf-8',
      filename: 'report.json',
    });

    const req = new NextRequest('http://localhost/api/v1/reports/rpt_ready?download=1&format=json', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${makeToken()}`,
      },
    });

    const res = await GET(req, { params: Promise.resolve({ id: 'rpt_ready' }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(await res.text()).toContain('"ok":true');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'compliance.report.download',
          orgId: 'org-1',
          userId: 'user-1',
        }),
      })
    );
  });
});
