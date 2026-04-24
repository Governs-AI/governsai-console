/**
 * TEST-2.2a — Dashboard audit log filter API (GOV-586).
 *
 * Covers:
 *  - 401 when unauthenticated
 *  - filter by decision type returns only matching events
 *  - time range (`from`/`to`) is passed to Prisma as gte/lte bounds
 *  - filtered query results match the Prisma response (integration-style)
 *  - pagination limit/offset and hasMore
 *  - validation: invalid `decision`, inverted time range
 *  - orgId is always sourced from the authenticated context
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/session', () => ({
  requireAuth: jest.fn(),
}));

import { requireAuth } from '@/lib/session';
import { GET } from '@/app/api/v1/audit/route';

const mockAuth = requireAuth as jest.Mock;
const mockPrisma = prisma as any;

const AUTH_CTX = {
  orgId: 'org-1',
  userId: 'user-1',
  roles: ['OWNER'],
  orgSlug: 'org',
  session: {},
};

function makeReq(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(AUTH_CTX);
  mockPrisma.decision.findMany.mockResolvedValue([]);
  mockPrisma.decision.count.mockResolvedValue(0);
});

describe('GET /api/v1/audit — auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockRejectedValueOnce(new Error('Authentication required'));
    const res = await GET(makeReq('http://localhost/api/v1/audit'));
    expect(res.status).toBe(401);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });

  it('always scopes to the authenticated orgId, ignoring any query-string orgId', async () => {
    const res = await GET(makeReq('http://localhost/api/v1/audit?orgId=other-org'));
    expect(res.status).toBe(200);
    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.orgId).toBe('org-1');
  });
});

describe('GET /api/v1/audit — filters', () => {
  it('filter by decision type returns only matching events', async () => {
    const denyEvents = [
      { id: 'd1', orgId: 'org-1', decision: 'deny', tool: 'search_web', ts: new Date() },
      { id: 'd2', orgId: 'org-1', decision: 'deny', tool: 'search_web', ts: new Date() },
    ];
    mockPrisma.decision.findMany.mockResolvedValueOnce(denyEvents);
    mockPrisma.decision.count.mockResolvedValueOnce(2);

    const res = await GET(makeReq('http://localhost/api/v1/audit?decision=deny'));
    expect(res.status).toBe(200);

    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.decision).toBe('deny');

    const body = await res.json();
    expect(body.events).toHaveLength(2);
    expect(body.events.every((e: any) => e.decision === 'deny')).toBe(true);
  });

  it('rejects an invalid decision value with 400', async () => {
    const res = await GET(makeReq('http://localhost/api/v1/audit?decision=maybe'));
    expect(res.status).toBe(400);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });

  it('passes `from`/`to` to Prisma as gte/lte bounds on ts', async () => {
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2026-01-31T23:59:59.000Z';
    const res = await GET(makeReq(`http://localhost/api/v1/audit?from=${from}&to=${to}`));
    expect(res.status).toBe(200);

    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.ts.gte.toISOString()).toBe(from);
    expect(where.ts.lte.toISOString()).toBe(to);
  });

  it('returns 400 when `from` is after `to`', async () => {
    const res = await GET(
      makeReq('http://localhost/api/v1/audit?from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z'),
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.decision.findMany).not.toHaveBeenCalled();
  });

  it('filters by tool and maps `user` to correlationId', async () => {
    const res = await GET(
      makeReq('http://localhost/api/v1/audit?tool=search_web&user=corr-abc'),
    );
    expect(res.status).toBe(200);
    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.tool).toBe('search_web');
    expect(where.correlationId).toBe('corr-abc');
  });

  it('ignores malformed date values (treats them as absent)', async () => {
    const res = await GET(makeReq('http://localhost/api/v1/audit?from=not-a-date'));
    expect(res.status).toBe(200);
    const where = mockPrisma.decision.findMany.mock.calls[0][0].where;
    expect(where.ts).toBeUndefined();
  });
});

describe('GET /api/v1/audit — integration: filtered results match Prisma response', () => {
  it('returns exactly the events Prisma produces and a matching total count', async () => {
    const dbRows = [
      { id: 'a', orgId: 'org-1', decision: 'allow', tool: 'x', ts: new Date('2026-03-01') },
      { id: 'b', orgId: 'org-1', decision: 'allow', tool: 'y', ts: new Date('2026-03-02') },
      { id: 'c', orgId: 'org-1', decision: 'allow', tool: 'z', ts: new Date('2026-03-03') },
    ];
    mockPrisma.decision.findMany.mockResolvedValueOnce(dbRows);
    mockPrisma.decision.count.mockResolvedValueOnce(3);

    const res = await GET(makeReq('http://localhost/api/v1/audit?decision=allow'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.events).toHaveLength(dbRows.length);
    expect(body.events.map((e: any) => e.id)).toEqual(dbRows.map((r) => r.id));
    expect(body.pagination.total).toBe(3);

    // findMany and count must see the same where clause so totals match the list
    const listWhere = mockPrisma.decision.findMany.mock.calls[0][0].where;
    const countWhere = mockPrisma.decision.count.mock.calls[0][0].where;
    expect(countWhere).toEqual(listWhere);
  });
});

describe('GET /api/v1/audit — pagination', () => {
  it('applies limit and offset and reports hasMore', async () => {
    mockPrisma.decision.findMany.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, orgId: 'org-1' })),
    );
    mockPrisma.decision.count.mockResolvedValueOnce(25);

    const res = await GET(makeReq('http://localhost/api/v1/audit?limit=10&offset=10'));
    expect(res.status).toBe(200);

    const call = mockPrisma.decision.findMany.mock.calls[0][0];
    expect(call.take).toBe(10);
    expect(call.skip).toBe(10);

    const body = await res.json();
    expect(body.pagination).toMatchObject({ limit: 10, offset: 10, total: 25, hasMore: true });
  });

  it('reports hasMore=false on the final page', async () => {
    mockPrisma.decision.findMany.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, i) => ({ id: `e${i}` })),
    );
    mockPrisma.decision.count.mockResolvedValueOnce(25);

    const res = await GET(makeReq('http://localhost/api/v1/audit?limit=10&offset=20'));
    const body = await res.json();
    expect(body.pagination.hasMore).toBe(false);
  });

  it('caps limit at 500 to prevent runaway queries', async () => {
    const res = await GET(makeReq('http://localhost/api/v1/audit?limit=99999'));
    expect(res.status).toBe(200);
    expect(mockPrisma.decision.findMany.mock.calls[0][0].take).toBe(500);
  });
});
