/**
 * TEST-3.7b — Console API: Org users route integration tests.
 *
 * Covers:
 *  - GET  /api/v1/orgs/[orgId]/users → 403 for non-admin; returns user list for admin
 *  - POST /api/v1/orgs/[orgId]/users → 400 missing email; 400 duplicate; 200 invite success
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/session', () => ({
  requireAuth: jest.fn(),
}));

import { requireAuth } from '@/lib/session';
import { GET, POST } from '@/app/api/v1/orgs/[orgId]/users/route';

const mockAuth = requireAuth as jest.Mock;
const mockPrisma = prisma as any;

const OWNER_CTX = { orgId: 'org-1', userId: 'owner-id', roles: ['OWNER'], orgSlug: 'slug', session: {} };

function makeReq(url: string, method = 'GET', body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ORG_PARAMS = { params: Promise.resolve({ orgId: 'org-1' }) as any };

// ---------------------------------------------------------------------------
// GET /api/v1/orgs/[orgId]/users
// ---------------------------------------------------------------------------

describe('GET /api/v1/orgs/[orgId]/users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when requester is not admin/owner', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);
    // No matching ADMIN/OWNER membership → 403
    mockPrisma.orgMembership.findFirst.mockResolvedValueOnce(null);

    const res = await GET(makeReq('http://localhost/api/v1/orgs/org-1/users'), ORG_PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns user list for admin requester', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);

    // First call: admin membership check
    mockPrisma.orgMembership.findFirst.mockResolvedValueOnce({ role: 'OWNER', userId: 'owner-id' });
    // Second call: list all memberships
    mockPrisma.orgMembership.findMany.mockResolvedValue([
      {
        createdAt: new Date(),
        role: 'DEVELOPER',
        user: { id: 'u1', email: 'dev@example.com', name: 'Dev', emailVerified: new Date(), createdAt: new Date() },
      },
    ]);
    // Per-user detail lookups
    mockPrisma.mfaTotp.findUnique.mockResolvedValue({ enabled: true });
    mockPrisma.passkey.count.mockResolvedValue(2);

    const res = await GET(makeReq('http://localhost/api/v1/orgs/org-1/users'), ORG_PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('users');
    expect(body).toHaveProperty('total', 1);
    expect(body.users[0]).toMatchObject({
      email: 'dev@example.com',
      role: 'DEVELOPER',
      mfaEnabled: true,
      passkeysCount: 2,
    });
  });

  it('marks unverified users as pending', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);
    mockPrisma.orgMembership.findFirst.mockResolvedValueOnce({ role: 'ADMIN' });
    mockPrisma.orgMembership.findMany.mockResolvedValue([
      {
        createdAt: new Date(),
        role: 'VIEWER',
        user: { id: 'u2', email: 'pending@example.com', name: null, emailVerified: null, createdAt: new Date() },
      },
    ]);
    mockPrisma.mfaTotp.findUnique.mockResolvedValue(null);
    mockPrisma.passkey.count.mockResolvedValue(0);

    const res = await GET(makeReq('http://localhost/api/v1/orgs/org-1/users'), ORG_PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users[0].status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/orgs/[orgId]/users
// ---------------------------------------------------------------------------

describe('POST /api/v1/orgs/[orgId]/users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when requester is not admin/owner', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);
    mockPrisma.orgMembership.findFirst.mockResolvedValueOnce(null);

    const res = await POST(
      makeReq('http://localhost/api/v1/orgs/org-1/users', 'POST', { email: 'x@y.com' }),
      ORG_PARAMS,
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when email is missing', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);
    mockPrisma.orgMembership.findFirst.mockResolvedValueOnce({ role: 'OWNER' });

    const res = await POST(
      makeReq('http://localhost/api/v1/orgs/org-1/users', 'POST', { name: 'No Email' }),
      ORG_PARAMS,
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when user is already a member', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);
    // Admin check passes
    mockPrisma.orgMembership.findFirst
      .mockResolvedValueOnce({ role: 'OWNER' })  // admin check
      .mockResolvedValueOnce({ id: 'existing-membership' }); // duplicate check
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u99', email: 'existing@x.com', name: null });

    const res = await POST(
      makeReq('http://localhost/api/v1/orgs/org-1/users', 'POST', { email: 'existing@x.com', role: 'developer' }),
      ORG_PARAMS,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already a member/i);
  });

  it('creates new user and membership when email is not in DB', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);
    mockPrisma.orgMembership.findFirst
      .mockResolvedValueOnce({ role: 'ADMIN' })  // admin check
      .mockResolvedValueOnce(null);              // not already a member
    mockPrisma.user.findUnique.mockResolvedValue(null); // user doesn't exist yet
    mockPrisma.user.create.mockResolvedValue({ id: 'new-user', email: 'new@x.com', name: 'New' });
    mockPrisma.orgMembership.create.mockResolvedValue({
      role: 'DEVELOPER',
      user: { id: 'new-user', email: 'new@x.com', name: 'New', emailVerified: null },
    });

    const res = await POST(
      makeReq('http://localhost/api/v1/orgs/org-1/users', 'POST', { email: 'new@x.com', role: 'developer' }),
      ORG_PARAMS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toMatchObject({ email: 'new@x.com', role: 'DEVELOPER' });
  });

  it('adds membership to existing user without creating duplicate user', async () => {
    mockAuth.mockResolvedValue(OWNER_CTX);
    mockPrisma.orgMembership.findFirst
      .mockResolvedValueOnce({ role: 'OWNER' }) // admin check
      .mockResolvedValueOnce(null);             // not already a member
    // User already exists
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-u', email: 'existing@x.com', name: 'Existing' });
    mockPrisma.orgMembership.create.mockResolvedValue({
      role: 'VIEWER',
      user: { id: 'existing-u', email: 'existing@x.com', name: 'Existing', emailVerified: new Date() },
    });

    const res = await POST(
      makeReq('http://localhost/api/v1/orgs/org-1/users', 'POST', { email: 'existing@x.com', role: 'viewer' }),
      ORG_PARAMS,
    );
    expect(res.status).toBe(200);
    // User should NOT have been created again
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});
