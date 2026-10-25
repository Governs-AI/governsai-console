/**
 * V2.13 — the shared tool catalog is admin-managed.
 *
 * Any signed-in user or API key can read it; only a signed-in OWNER/ADMIN can
 * create, edit or delete entries. API keys are read-only.
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
const TOOL = { id: 't1', toolName: 'payment_process', category: 'financial', riskLevel: 'critical', scope: 'net.external' };
const NEW_TOOL = { toolName: 'crm_lookup', category: 'data', riskLevel: 'low', scope: 'net.external' };
const params = { params: Promise.resolve({ id: 't1' }) };

function req(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/v1/tools', {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** Caller is an API key holder. */
function asApiKey() {
  (cookies as jest.Mock).mockResolvedValue({ get: () => undefined });
  mockPrisma.aPIKey.findFirst.mockImplementation(async ({ where }: any) =>
    where.keyHash === createHash('sha256').update(KEY).digest('hex')
      ? { userId: 'u-key', orgId: 'org-1', expiresAt: null }
      : null,
  );
  return { 'x-governs-key': KEY };
}

/** Caller is signed in to the dashboard with `role` in their org (null: not a member). */
function asSession(role: 'OWNER' | 'ADMIN' | 'MEMBER' | null) {
  (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'session-cookie' }) });
  (verifySessionToken as jest.Mock).mockReturnValue({ sub: 'u-1', orgId: 'org-1', roles: [] });
  mockPrisma.orgMembership.findFirst.mockImplementation(async ({ where }: any) =>
    role && where.role.in.includes(role) ? { id: 'm1' } : null,
  );
  return {};
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.toolConfig.findMany.mockResolvedValue([TOOL]);
  mockPrisma.toolConfig.findUnique.mockResolvedValue(TOOL);
  mockPrisma.toolConfig.createMany.mockResolvedValue({ count: 0 });
  mockPrisma.toolConfig.upsert.mockResolvedValue({ ...NEW_TOOL, id: 't2' });
  mockPrisma.toolConfig.update.mockResolvedValue({ ...TOOL, riskLevel: 'high' });
  mockPrisma.toolConfig.delete.mockResolvedValue(TOOL);
});

describe('API key holders: read-only', () => {
  it('can list and read tools', async () => {
    const headers = asApiKey();
    expect((await GET(req('GET', undefined, headers))).status).toBe(200);
    expect((await GET_ONE(req('GET', undefined, headers), params)).status).toBe(200);
  });

  it('cannot create a tool', async () => {
    const res = await POST(req('POST', NEW_TOOL, asApiKey()));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/read-only for API keys/);
    expect(mockPrisma.toolConfig.upsert).not.toHaveBeenCalled();
  });

  it('cannot edit or delete a tool', async () => {
    const headers = asApiKey();
    expect((await PUT(req('PUT', { riskLevel: 'low' }, headers), params)).status).toBe(403);
    expect((await DELETE(req('DELETE', undefined, headers), params)).status).toBe(403);
    expect(mockPrisma.toolConfig.update).not.toHaveBeenCalled();
    expect(mockPrisma.toolConfig.delete).not.toHaveBeenCalled();
  });
});

describe('dashboard users', () => {
  it('members can read but not write', async () => {
    const headers = asSession('MEMBER');
    expect((await GET(req('GET', undefined, headers))).status).toBe(200);
    expect((await POST(req('POST', NEW_TOOL, headers))).status).toBe(403);
    expect((await PUT(req('PUT', { riskLevel: 'low' }, headers), params)).status).toBe(403);
    expect(mockPrisma.toolConfig.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.toolConfig.update).not.toHaveBeenCalled();
  });

  it.each(['OWNER', 'ADMIN'] as const)('%s can create, edit and delete', async (role) => {
    const headers = asSession(role);
    expect((await POST(req('POST', NEW_TOOL, headers))).status).toBe(201);
    expect((await PUT(req('PUT', { riskLevel: 'high' }, headers), params)).status).toBe(200);
    expect((await DELETE(req('DELETE', undefined, headers), params)).status).toBe(200);
    expect(mockPrisma.toolConfig.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.toolConfig.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.toolConfig.delete).toHaveBeenCalledTimes(1);
  });

  it('the role is checked in the database for the active org', async () => {
    asSession('ADMIN');
    await POST(req('POST', NEW_TOOL));
    expect(mockPrisma.orgMembership.findFirst.mock.calls[0][0].where).toEqual({
      userId: 'u-1',
      orgId: 'org-1',
      role: { in: ['OWNER', 'ADMIN'] },
    });
  });
});

it('anonymous callers get 401 for reads and writes', async () => {
  (cookies as jest.Mock).mockResolvedValue({ get: () => undefined });
  expect((await GET(req('GET'))).status).toBe(401);
  expect((await POST(req('POST', NEW_TOOL))).status).toBe(401);
});
