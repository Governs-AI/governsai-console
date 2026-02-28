/**
 * TEST-3.7a — Console API: Keys CRUD route integration tests.
 *
 * Covers:
 *  - GET  /api/v1/keys      → returns masked key list; 401 when unauthenticated
 *  - POST /api/v1/keys      → creates key and returns full value; 400 on missing fields
 *  - DELETE /api/v1/keys/[id] → 404 on not-found; 200 on success
 *  - PATCH  /api/v1/keys/[id] → toggles isActive; 404 on not-found
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

// requireAuth must be mocked before the route module is imported
jest.mock('@/lib/session', () => ({
  requireAuth: jest.fn(),
}));

import { requireAuth } from '@/lib/session';
import { GET, POST } from '@/app/api/v1/keys/route';
import { DELETE, PATCH } from '@/app/api/v1/keys/[id]/route';

const mockAuth = requireAuth as jest.Mock;
const mockPrisma = prisma as any;

const AUTH_CTX = { orgId: 'org-1', userId: 'user-1', roles: ['OWNER'], orgSlug: 'org', session: {} };

function makeReq(url: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/keys
// ---------------------------------------------------------------------------

describe('GET /api/v1/keys', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockRejectedValue(new Error('Authentication required'));
    const res = await GET(makeReq('http://localhost/api/v1/keys'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns array of masked keys for authenticated user', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.findMany.mockResolvedValue([
      { id: 'k1', name: 'SDK Key', scopes: ['decisions'], createdAt: new Date(), lastUsed: null, isActive: true },
    ]);

    const res = await GET(makeReq('http://localhost/api/v1/keys'));
    expect(res.status).toBe(200);
    const keys = await res.json();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ id: 'k1', name: 'SDK Key', isActive: true });
    // Raw key value must NEVER be in the list response
    expect(keys[0]).not.toHaveProperty('key');
  });

  it('returns empty array when org has no keys', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.findMany.mockResolvedValue([]);

    const res = await GET(makeReq('http://localhost/api/v1/keys'));
    expect(res.status).toBe(200);
    const keys = await res.json();
    expect(keys).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/keys
// ---------------------------------------------------------------------------

describe('POST /api/v1/keys', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeReq('http://localhost/api/v1/keys', 'POST', { scopes: ['decisions'] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when scopes is missing', async () => {
    const res = await POST(makeReq('http://localhost/api/v1/keys', 'POST', { name: 'My Key' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when scopes is not an array', async () => {
    const res = await POST(makeReq('http://localhost/api/v1/keys', 'POST', { name: 'K', scopes: 'decisions' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated after field validation passes', async () => {
    mockAuth.mockRejectedValue(new Error('Authentication required'));
    const res = await POST(makeReq('http://localhost/api/v1/keys', 'POST', { name: 'K', scopes: ['decisions'] }));
    expect(res.status).toBe(401);
  });

  it('creates key and returns full key value on success', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.create.mockResolvedValue({
      id: 'new-id',
      name: 'SDK Key',
      scopes: ['decisions'],
      key: 'gai_abc123def456',
      createdAt: new Date(),
      isActive: true,
    });

    const res = await POST(makeReq('http://localhost/api/v1/keys', 'POST', { name: 'SDK Key', scopes: ['decisions'] }));
    expect(res.status).toBe(200);
    const data = await res.json();
    // The key value is ONLY returned at creation time
    expect(data).toHaveProperty('key');
    expect(data.key).toMatch(/^gai_/);
    expect(data).toHaveProperty('id', 'new-id');
    expect(data.isActive).toBe(true);
  });

  it('accepts label as a fallback for name', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.create.mockResolvedValue({
      id: 'id2', name: 'Labelled', scopes: ['usage'], key: 'gai_xyz', createdAt: new Date(), isActive: true,
    });

    const res = await POST(makeReq('http://localhost/api/v1/keys', 'POST', { label: 'Labelled', scopes: ['usage'] }));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/keys/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/keys/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockRejectedValue(new Error('Authentication required'));
    const res = await DELETE(
      makeReq('http://localhost/api/v1/keys/k1', 'DELETE'),
      { params: { id: 'k1' } as any },
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when key not found or belongs to different org', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.findFirst.mockResolvedValue(null);
    const res = await DELETE(
      makeReq('http://localhost/api/v1/keys/not-exist', 'DELETE'),
      { params: { id: 'not-exist' } as any },
    );
    expect(res.status).toBe(404);
  });

  it('deletes the key and returns success message', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k1', orgId: 'org-1' });
    mockPrisma.aPIKey.delete.mockResolvedValue({});

    const res = await DELETE(
      makeReq('http://localhost/api/v1/keys/k1', 'DELETE'),
      { params: { id: 'k1' } as any },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('message');
    expect(mockPrisma.aPIKey.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/keys/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/keys/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when key not found', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.findFirst.mockResolvedValue(null);
    const res = await PATCH(
      makeReq('http://localhost/api/v1/keys/x', 'PATCH', { isActive: false }),
      { params: { id: 'x' } as any },
    );
    expect(res.status).toBe(404);
  });

  it('deactivates a key and reflects the new status', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k1', orgId: 'org-1' });
    mockPrisma.aPIKey.update.mockResolvedValue({
      id: 'k1', name: 'SDK Key', scopes: [], createdAt: new Date(), lastUsed: null, isActive: false,
    });

    const res = await PATCH(
      makeReq('http://localhost/api/v1/keys/k1', 'PATCH', { isActive: false }),
      { params: { id: 'k1' } as any },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isActive).toBe(false);
    expect(mockPrisma.aPIKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'k1' } }),
    );
  });

  it('activates a key', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k1', orgId: 'org-1' });
    mockPrisma.aPIKey.update.mockResolvedValue({
      id: 'k1', name: 'SDK Key', scopes: [], createdAt: new Date(), lastUsed: null, isActive: true,
    });

    const res = await PATCH(
      makeReq('http://localhost/api/v1/keys/k1', 'PATCH', { isActive: true }),
      { params: { id: 'k1' } as any },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isActive).toBe(true);
  });
});
