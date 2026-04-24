/**
 * TEST-2.2b-api — Dashboard audit log CSV export (GOV-602).
 *
 * Covers:
 *  - 401 when unauthenticated
 *  - 403 when authenticated role is below ADMIN
 *  - CSV headers and row format
 *  - same filter params as /api/v1/audit (decision, tool, user, from, to)
 *  - orgId is always sourced from the authenticated context
 *  - validation: invalid decision, invalid format, inverted time range
 *  - integration: exported rows match the filtered Prisma response
 *  - streaming: 10k+ rows do not buffer — findMany is paged with a cursor
 *  - CSV escaping: commas, quotes, newlines, and JSON columns are quoted
 *  - Content-Type / Content-Disposition response headers
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/session', () => ({
  requireAuth: jest.fn(),
  requireRole: jest.fn(),
}));

import { requireRole } from '@/lib/session';
import { GET } from '@/app/api/v1/audit/export/route';

const mockRole = requireRole as jest.Mock;
const mockPrisma = prisma as any;

const AUTH_CTX = {
  orgId: 'org-1',
  userId: 'user-1',
  roles: ['ADMIN'],
  orgSlug: 'org',
  session: {},
};

function makeReq(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

async function readStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

const CSV_HEADER_LINE =
  'id,ts,orgId,decision,direction,tool,scope,policyId,correlationId,latencyMs,payloadHash,reasons,tags,detectorSummary';

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.mockResolvedValue(AUTH_CTX);
  mockPrisma.decision.findMany.mockResolvedValue([]);
});

describe('GET /api/v1/audit/export — auth & role', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRole.mockRejectedValueOnce(new Error('Authentication required'));
    const res = await GET(makeReq('http://localhost/api/v1/audit/export?format=csv'));
    expect(res.status).toBe(401);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated user lacks required role', async () => {
    mockRole.mockRejectedValueOnce(new Error('Role ADMIN required'));
    const res = await GET(makeReq('http://localhost/api/v1/audit/export?format=csv'));
    expect(res.status).toBe(403);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });

  it('enforces ADMIN as the minimum role', async () => {
    await GET(makeReq('http://localhost/api/v1/audit/export?format=csv'));
    expect(mockRole).toHaveBeenCalledWith(expect.anything(), 'ADMIN');
  });

  it('always scopes to the authenticated orgId, ignoring any query-string orgId', async () => {
    await GET(
      makeReq('http://localhost/api/v1/audit/export?format=csv&orgId=other-org'),
    );
    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.orgId).toBe('org-1');
  });
});

describe('GET /api/v1/audit/export — CSV output format', () => {
  it('emits a CSV header row with the expected columns', async () => {
    const res = await GET(makeReq('http://localhost/api/v1/audit/export?format=csv'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="audit-export-.+\.csv"$/,
    );

    const body = await readStream(res);
    const [header] = body.split('\n');
    expect(header).toBe(CSV_HEADER_LINE);
  });

  it('writes one CSV row per decision with correct column order', async () => {
    mockPrisma.decision.findMany.mockResolvedValueOnce([
      {
        id: 'dec-1',
        ts: new Date('2026-03-01T12:00:00.000Z'),
        orgId: 'org-1',
        decision: 'allow',
        direction: 'ingress',
        tool: 'search_web',
        scope: 'read',
        policyId: 'pol-1',
        correlationId: 'corr-1',
        latencyMs: 42,
        payloadHash: 'hash-1',
        reasons: ['ok'],
        tags: ['prod'],
        detectorSummary: { pii: 0 },
      },
    ]);

    const res = await GET(makeReq('http://localhost/api/v1/audit/export?format=csv'));
    const body = await readStream(res);
    const lines = body.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      [
        'dec-1',
        '2026-03-01T12:00:00.000Z',
        'org-1',
        'allow',
        'ingress',
        'search_web',
        'read',
        'pol-1',
        'corr-1',
        '42',
        'hash-1',
        '"[""ok""]"',
        '"[""prod""]"',
        '"{""pii"":0}"',
      ].join(','),
    );
  });

  it('escapes values containing commas, quotes, and newlines per RFC 4180', async () => {
    mockPrisma.decision.findMany.mockResolvedValueOnce([
      {
        id: 'dec-x',
        ts: new Date('2026-03-01T00:00:00.000Z'),
        orgId: 'org-1',
        decision: 'deny',
        direction: 'egress',
        tool: 'a,b',
        scope: 'he said "hi"',
        policyId: null,
        correlationId: 'line1\nline2',
        latencyMs: null,
        payloadHash: 'h',
        reasons: null,
        tags: [],
        detectorSummary: {},
      },
    ]);

    const res = await GET(makeReq('http://localhost/api/v1/audit/export?format=csv'));
    const body = await readStream(res);
    expect(body).toContain('"a,b"');
    expect(body).toContain('"he said ""hi"""');
    expect(body).toContain('"line1\nline2"');
    // null values render as empty fields (policyId, then correlationId quoted, then latencyMs)
    expect(body).toContain(',"he said ""hi""",,"line1\nline2",,h,,');
  });
});

describe('GET /api/v1/audit/export — filters', () => {
  it('filters by decision, tool, and user (mapped to correlationId)', async () => {
    await GET(
      makeReq(
        'http://localhost/api/v1/audit/export?format=csv&decision=deny&tool=search_web&user=corr-abc',
      ),
    );
    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.decision).toBe('deny');
    expect(where.tool).toBe('search_web');
    expect(where.correlationId).toBe('corr-abc');
  });

  it('passes `from`/`to` to Prisma as gte/lte bounds on ts', async () => {
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2026-01-31T23:59:59.000Z';
    await GET(
      makeReq(`http://localhost/api/v1/audit/export?format=csv&from=${from}&to=${to}`),
    );
    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.ts.gte.toISOString()).toBe(from);
    expect(where.ts.lte.toISOString()).toBe(to);
  });

  it('ignores malformed date values (treats them as absent)', async () => {
    await GET(
      makeReq('http://localhost/api/v1/audit/export?format=csv&from=not-a-date'),
    );
    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.ts).toBeUndefined();
  });

  it('rejects an invalid decision value with 400', async () => {
    const res = await GET(
      makeReq('http://localhost/api/v1/audit/export?format=csv&decision=maybe'),
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid format value with 400', async () => {
    const res = await GET(
      makeReq('http://localhost/api/v1/audit/export?format=xlsx'),
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });

  it('defaults format to csv when omitted', async () => {
    const res = await GET(makeReq('http://localhost/api/v1/audit/export'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
  });

  it('returns 400 when `from` is after `to`', async () => {
    const res = await GET(
      makeReq(
        'http://localhost/api/v1/audit/export?format=csv&from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z',
      ),
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/audit/export — integration: filtered results match Prisma response', () => {
  it('exports exactly the rows Prisma returns for the filter', async () => {
    const dbRows = [
      {
        id: 'a',
        orgId: 'org-1',
        decision: 'allow',
        direction: 'ingress',
        tool: 'x',
        scope: null,
        policyId: null,
        correlationId: null,
        latencyMs: 1,
        payloadHash: 'h',
        reasons: null,
        tags: [],
        detectorSummary: {},
        ts: new Date('2026-03-01'),
      },
      {
        id: 'b',
        orgId: 'org-1',
        decision: 'allow',
        direction: 'ingress',
        tool: 'y',
        scope: null,
        policyId: null,
        correlationId: null,
        latencyMs: 2,
        payloadHash: 'h',
        reasons: null,
        tags: [],
        detectorSummary: {},
        ts: new Date('2026-03-02'),
      },
    ];
    mockPrisma.decision.findMany.mockResolvedValueOnce(dbRows);

    const res = await GET(
      makeReq('http://localhost/api/v1/audit/export?format=csv&decision=allow'),
    );
    const body = await readStream(res);
    const lines = body.trim().split('\n');
    expect(lines).toHaveLength(dbRows.length + 1);
    expect(lines[1].startsWith('a,')).toBe(true);
    expect(lines[2].startsWith('b,')).toBe(true);

    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.decision).toBe('allow');
    expect(where.orgId).toBe('org-1');
  });
});

describe('GET /api/v1/audit/export — streaming large exports', () => {
  function makeRow(i: number) {
    return {
      id: `r${String(i).padStart(6, '0')}`,
      ts: new Date(2026, 0, 1, 0, 0, i),
      orgId: 'org-1',
      decision: 'allow',
      direction: 'ingress',
      tool: 't',
      scope: null,
      policyId: null,
      correlationId: null,
      latencyMs: 0,
      payloadHash: 'h',
      reasons: null,
      tags: [],
      detectorSummary: {},
    };
  }

  it('pages Prisma with a cursor instead of a single large take for 10k+ rows', async () => {
    const TOTAL = 10_000;
    let yielded = 0;

    mockPrisma.decision.findMany.mockImplementation(async (args: any) => {
      const take = args.take as number;
      if (yielded >= TOTAL) return [];
      const remaining = TOTAL - yielded;
      const pageSize = Math.min(take, remaining);
      const batch = Array.from({ length: pageSize }, (_, i) => makeRow(yielded + i));
      yielded += pageSize;
      return batch;
    });

    const res = await GET(
      makeReq('http://localhost/api/v1/audit/export?format=csv'),
    );
    const body = await readStream(res);

    const lines = body.split('\n').filter(Boolean);
    // header + 10k rows
    expect(lines).toHaveLength(TOTAL + 1);

    // Must have paged, not pulled everything at once.
    const calls = mockPrisma.decision.findMany.mock.calls;
    expect(calls.length).toBeGreaterThan(1);
    for (const [args] of calls) {
      expect(args.take).toBeLessThanOrEqual(1000);
    }
    // Every call after the first must use a cursor.
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i][0].cursor).toBeDefined();
      expect(calls[i][0].skip).toBe(1);
    }
  });

  it('stops paging when a short page is returned', async () => {
    mockPrisma.decision.findMany
      .mockResolvedValueOnce(Array.from({ length: 500 }, (_, i) => makeRow(i)))
      .mockResolvedValueOnce(Array.from({ length: 3 }, (_, i) => makeRow(500 + i)));

    const res = await GET(
      makeReq('http://localhost/api/v1/audit/export?format=csv'),
    );
    const body = await readStream(res);
    const lines = body.split('\n').filter(Boolean);
    expect(lines).toHaveLength(503 + 1);
    expect(mockPrisma.decision.findMany).toHaveBeenCalledTimes(2);
  });
});
