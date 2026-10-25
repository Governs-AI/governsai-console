/**
 * V2.13 / V2.17 — the tool catalog is admin-managed and scoped per org.
 *
 * - Reads: any signed-in user or API key; global entries plus the caller's
 *   org entries, the org's entry winning over a global one of the same name.
 * - Writes: a signed-in OWNER/ADMIN, only on their own org's entries. Global
 *   entries (orgId null) are read-only; another org's entries are invisible.
 * - API keys are read-only.
 */

import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/lib/auth-server', () => ({ verifySessionToken: jest.fn() }));

import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth-server';
import { GET, POST } from '@/app/api/v1/tools/route';
import { DELETE, GET as GET_ONE, PUT } from '@/app/api/v1/tools/[id]/route';

const mockPrisma = prisma as any;
const KEY = 'gai_integration_key';

const GLOBAL = { id: 'g1', orgId: null, toolName: 'payment_process', category: 'financial', riskLevel: 'critical', scope: 'net.external', isActive: true };
const OWN = { id: 'a1', orgId: 'org-A', toolName: 'crm_lookup', category: 'data', riskLevel: 'low', scope: 'net.external', isActive: true };
const OTHER = { id: 'b1', orgId: 'org-B', toolName: 'erp_sync', category: 'data', riskLevel: 'low', scope: 'net.external', isActive: true };
const OVERRIDE = { ...GLOBAL, id: 'a2', orgId: 'org-A', riskLevel: 'high' };
const ROWS = [GLOBAL, OWN, OTHER, OVERRIDE];
const NEW_TOOL = { toolName: 'ticket_create', category: 'data', riskLevel: 'low', scope: 'net.external' };

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function req(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/v1/tools', {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** Rows visible under a `{ OR: [{orgId: null}, {orgId}] }`-style where clause. */
function visible(where: any): typeof ROWS {
  const scope = where?.AND ? where.AND[0] : where;
  const orgs = (scope?.OR ?? []).map((c: any) => c.orgId);
  let rows = ROWS.filter((r) => orgs.includes(r.orgId));
  const idClause = where?.AND?.[1];
  if (idClause?.id) rows = rows.filter((r) => r.id === idClause.id);
  return rows;
}

function asApiKey(orgId = 'org-A') {
  (cookies as jest.Mock).mockResolvedValue({ get: () => undefined });
  mockPrisma.aPIKey.findFirst.mockImplementation(async ({ where }: any) =>
    where.keyHash === createHash('sha256').update(KEY).digest('hex')
      ? { userId: 'u-key', orgId, expiresAt: null }
      : null,
  );
  return { 'x-governs-key': KEY };
}

function asSession(role: 'OWNER' | 'ADMIN' | 'MEMBER', orgId = 'org-A') {
  (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'session-cookie' }) });
  (verifySessionToken as jest.Mock).mockReturnValue({ sub: 'u-1', orgId, roles: [] });
  mockPrisma.orgMembership.findFirst.mockImplementation(async ({ where }: any) =>
    where.role.in.includes(role) ? { id: 'm1' } : null,
  );
  return {};
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.toolConfig.findMany.mockImplementation(async ({ where }: any) =>
    where.orgId === null ? [GLOBAL] : visible(where), // seeding query vs catalog read
  );
  mockPrisma.toolConfig.findFirst.mockImplementation(async ({ where }: any) => visible(where)[0] ?? null);
  mockPrisma.toolConfig.findUnique.mockImplementation(async ({ where }: any) => ROWS.find((r) => r.id === where.id) ?? null);
  mockPrisma.toolConfig.createMany.mockResolvedValue({ count: 0 });
  mockPrisma.toolConfig.upsert.mockImplementation(async ({ create }: any) => ({ id: 'new', ...create }));
  mockPrisma.toolConfig.update.mockResolvedValue({ ...OWN, riskLevel: 'high' });
  mockPrisma.toolConfig.delete.mockResolvedValue(OWN);
});

describe('reads', () => {
  it('list global + own org entries, own override winning, never another org', async () => {
    const res = await GET(req('GET', undefined, asApiKey()));
    expect(res.status).toBe(200);
    const { tools } = await res.json();
    const byName = Object.fromEntries(tools.map((t: any) => [t.toolName, t]));
    expect(Object.keys(byName).sort()).toEqual(['crm_lookup', 'payment_process']);
    expect(byName.payment_process).toMatchObject({ id: 'a2', riskLevel: 'high', editable: true });
    expect(byName.crm_lookup.editable).toBe(true);
  });

  it('another org sees the global entry, not org A\'s override', async () => {
    const { tools } = await (await GET(req('GET', undefined, asApiKey('org-B')))).json();
    const pay = tools.find((t: any) => t.toolName === 'payment_process');
    expect(pay).toMatchObject({ id: 'g1', riskLevel: 'critical', editable: false });
    expect(tools.find((t: any) => t.toolName === 'crm_lookup')).toBeUndefined();
  });

  it('a single entry from another org is a 404', async () => {
    const headers = asApiKey();
    expect((await GET_ONE(req('GET', undefined, headers), params('g1'))).status).toBe(200);
    expect((await GET_ONE(req('GET', undefined, headers), params('b1'))).status).toBe(404);
  });
});

describe('API key holders: read-only', () => {
  it('cannot create, edit or delete', async () => {
    const headers = asApiKey();
    expect((await POST(req('POST', NEW_TOOL, headers))).status).toBe(403);
    expect((await PUT(req('PUT', { riskLevel: 'low' }, headers), params('a1'))).status).toBe(403);
    expect((await DELETE(req('DELETE', undefined, headers), params('a1'))).status).toBe(403);
    expect(mockPrisma.toolConfig.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.toolConfig.update).not.toHaveBeenCalled();
    expect(mockPrisma.toolConfig.delete).not.toHaveBeenCalled();
  });
});

describe('org admins', () => {
  it('members cannot write at all', async () => {
    const headers = asSession('MEMBER');
    expect((await POST(req('POST', NEW_TOOL, headers))).status).toBe(403);
    expect((await PUT(req('PUT', { riskLevel: 'low' }, headers), params('a1'))).status).toBe(403);
  });

  it.each(['OWNER', 'ADMIN'] as const)('%s creates entries in their own org', async (role) => {
    const res = await POST(req('POST', NEW_TOOL, asSession(role)));
    expect(res.status).toBe(201);
    const call = mockPrisma.toolConfig.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ orgId_toolName: { orgId: 'org-A', toolName: 'ticket_create' } });
    expect(call.create.orgId).toBe('org-A');
  });

  it("an entry named like a global one becomes this org's override", async () => {
    await POST(req('POST', { ...NEW_TOOL, toolName: 'payment_process' }, asSession('ADMIN')));
    const call = mockPrisma.toolConfig.upsert.mock.calls[0][0];
    expect(call.where.orgId_toolName).toEqual({ orgId: 'org-A', toolName: 'payment_process' });
  });

  it('edit and delete their own entries', async () => {
    const headers = asSession('ADMIN');
    expect((await PUT(req('PUT', { riskLevel: 'high' }, headers), params('a1'))).status).toBe(200);
    expect((await DELETE(req('DELETE', undefined, headers), params('a1'))).status).toBe(200);
  });

  it('cannot edit or delete a global entry', async () => {
    const headers = asSession('OWNER');
    const res = await PUT(req('PUT', { riskLevel: 'low' }, headers), params('g1'));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/read-only/);
    expect((await DELETE(req('DELETE', undefined, headers), params('g1'))).status).toBe(403);
    expect(mockPrisma.toolConfig.update).not.toHaveBeenCalled();
    expect(mockPrisma.toolConfig.delete).not.toHaveBeenCalled();
  });

  it("cannot see, edit or delete another org's entry", async () => {
    const headers = asSession('OWNER');
    expect((await PUT(req('PUT', { riskLevel: 'low' }, headers), params('b1'))).status).toBe(404);
    expect((await DELETE(req('DELETE', undefined, headers), params('b1'))).status).toBe(404);
    expect(mockPrisma.toolConfig.update).not.toHaveBeenCalled();
    expect(mockPrisma.toolConfig.delete).not.toHaveBeenCalled();
  });
});

it('anonymous callers get 401', async () => {
  (cookies as jest.Mock).mockResolvedValue({ get: () => undefined });
  expect((await GET(req('GET'))).status).toBe(401);
  expect((await POST(req('POST', NEW_TOOL))).status).toBe(401);
});
