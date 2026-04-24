import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@governs-ai/db';

const afterCallbacks: Array<() => Promise<void> | void> = [];

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    after: jest.fn((cb: () => Promise<void> | void) => {
      afterCallbacks.push(cb);
    }),
  };
});

jest.mock('@/lib/services/compliance-report-service', () => ({
  buildComplianceReportStatus: jest.fn(),
  countActiveComplianceReportJobs: jest.fn(),
  createComplianceReportJob: jest.fn(),
  ensureComplianceReportJobReady: jest.fn(),
  findComplianceReportJob: jest.fn(),
  getComplianceReportDownload: jest.fn(),
  processComplianceReportJob: jest.fn(),
}));

import { POST } from '@/app/api/v1/reports/generate/route';
import { GET } from '@/app/api/v1/reports/[id]/route';
import {
  buildComplianceReportStatus,
  countActiveComplianceReportJobs,
  createComplianceReportJob,
  ensureComplianceReportJobReady,
  getComplianceReportDownload,
  processComplianceReportJob,
} from '@/lib/services/compliance-report-service';

const mockPrisma = prisma as any;
const mockBuildStatus = buildComplianceReportStatus as jest.Mock;
const mockCountActive = countActiveComplianceReportJobs as jest.Mock;
const mockCreateJob = createComplianceReportJob as jest.Mock;
const mockEnsureReady = ensureComplianceReportJobReady as jest.Mock;
const mockGetDownload = getComplianceReportDownload as jest.Mock;
const mockProcessJob = processComplianceReportJob as jest.Mock;

function makeToken(role: 'OWNER' | 'ADMIN' | 'VIEWER' = 'OWNER') {
  return jwt.sign(
    {
      sub: 'user-1',
      orgId: 'org-1',
      roles: [role],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    process.env.JWT_SECRET!
  );
}

function setAdminMembership() {
  mockPrisma.orgMembership.findFirst.mockResolvedValue({ role: 'OWNER' });
}

function setNonAdminMembership() {
  mockPrisma.orgMembership.findFirst.mockResolvedValue(null);
}

const pendingReport = {
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
};

const readyReport = {
  ...pendingReport,
  id: 'rpt_ready',
  status: 'ready',
  generatedAt: new Date('2026-04-24T15:00:00.000Z'),
  completedAt: new Date('2026-04-24T15:00:01.000Z'),
  reportJson: { ok: true },
  pdfData: Buffer.from('%PDF-1.4'),
  updatedAt: new Date('2026-04-24T15:00:01.000Z'),
};

describe('reports API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    afterCallbacks.length = 0;
    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      return Promise.all(arg);
    });
  });

  describe('POST /api/v1/reports/generate', () => {
    it('creates a pending report job, audits in a transaction, schedules after()', async () => {
      setAdminMembership();
      mockCountActive.mockResolvedValue(0);
      mockCreateJob.mockResolvedValue(pendingReport);
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
        artifacts: { pdf: null, json: null },
      });

      const req = new NextRequest('http://localhost/api/v1/reports/generate', {
        method: 'POST',
        body: JSON.stringify({
          startTime: '2026-04-01T00:00:00.000Z',
          endTime: '2026-04-24T00:00:00.000Z',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${makeToken('OWNER')}`,
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

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'compliance.report.generate.requested',
            orgId: 'org-1',
            userId: 'user-1',
          }),
        })
      );
      // after() registered exactly one callback for async processing
      expect(afterCallbacks).toHaveLength(1);
      mockProcessJob.mockResolvedValue(readyReport);
      await afterCallbacks[0]();
      expect(mockProcessJob).toHaveBeenCalledWith('rpt_pending');
    });

    it('returns 401 when no auth is provided', async () => {
      const req = new NextRequest('http://localhost/api/v1/reports/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      expect(mockCreateJob).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller is not ADMIN or OWNER', async () => {
      setNonAdminMembership();

      const req = new NextRequest('http://localhost/api/v1/reports/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${makeToken('VIEWER')}`,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      expect(mockCreateJob).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rate-limits when too many active jobs are already queued for the org', async () => {
      setAdminMembership();
      mockCountActive.mockResolvedValue(10);

      const req = new NextRequest('http://localhost/api/v1/reports/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${makeToken('OWNER')}`,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('30');
      expect(mockCreateJob).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/reports/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost/api/v1/reports/rpt_ready', {
        method: 'GET',
      });

      const res = await GET(req, { params: Promise.resolve({ id: 'rpt_ready' }) });
      expect(res.status).toBe(401);
    });

    it('returns 403 when the caller is not ADMIN or OWNER', async () => {
      setNonAdminMembership();

      const req = new NextRequest('http://localhost/api/v1/reports/rpt_ready', {
        method: 'GET',
        headers: { Authorization: `Bearer ${makeToken('VIEWER')}` },
      });

      const res = await GET(req, { params: Promise.resolve({ id: 'rpt_ready' }) });
      expect(res.status).toBe(403);
      expect(mockEnsureReady).not.toHaveBeenCalled();
    });

    it('returns report status payloads with artifact URLs', async () => {
      setAdminMembership();
      mockEnsureReady.mockResolvedValue(readyReport);
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
        headers: { Authorization: `Bearer ${makeToken('OWNER')}` },
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
      // self-heal path: status GET also calls ensureComplianceReportJobReady
      expect(mockEnsureReady).toHaveBeenCalledWith('rpt_ready', 'org-1');
    });

    it('downloads the generated JSON artifact once the job is ready', async () => {
      setAdminMembership();
      mockEnsureReady.mockResolvedValue(readyReport);
      mockGetDownload.mockReturnValue({
        body: JSON.stringify({ ok: true }),
        contentType: 'application/json; charset=utf-8',
        filename: 'report.json',
      });

      const req = new NextRequest(
        'http://localhost/api/v1/reports/rpt_ready?download=1&format=json',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${makeToken('OWNER')}` },
        }
      );

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
});
