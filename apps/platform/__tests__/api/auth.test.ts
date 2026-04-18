/**
 * QA.1 — Auth route contract tests.
 *
 * Covers:
 *   * POST /api/v1/auth/login  → 200 happy path, 401 bad creds, 400 bad input
 *   * POST /api/v1/auth/logout → 200 and clears the session cookie
 *   * POST /api/v1/auth/signup → 400 on duplicate user, 400 on bad input
 *
 * The signup flow has several non-deterministic side-effects (Keycloak sync,
 * email delivery). We mock `@/lib/auth`, `@/lib/email`, `@/lib/keycloak-admin`,
 * and `@/lib/keycloak-sync` so the route can run without external services.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

// ---------------------------------------------------------------------------
// Mock the lib modules that talk to external systems
// ---------------------------------------------------------------------------

jest.mock('@/lib/auth', () => ({
  verifyUserPassword: jest.fn(),
  createSessionToken: jest.fn(() => 'mock-session-token'),
  getUserOrganizations: jest.fn(),
  createUser: jest.fn(),
  createEmailVerificationToken: jest.fn(async () => 'tok-123'),
  createOrganization: jest.fn(),
  generateOrgSlug: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
}));

jest.mock('@/lib/email', () => ({
  sendVerificationEmail: jest.fn(async () => ({ success: true })),
}));

jest.mock('@/lib/keycloak-admin', () => ({
  syncUserToKeycloak: jest.fn(async () => ({ success: true })),
}));

jest.mock('@/lib/keycloak-sync', () => ({
  enqueueKeycloakSyncJob: jest.fn(async () => undefined),
  recordKeycloakSyncFailure: jest.fn(async () => undefined),
  recordKeycloakSyncSuccess: jest.fn(async () => undefined),
}));

import {
  verifyUserPassword,
  getUserOrganizations,
  createUser,
  createOrganization,
} from '@/lib/auth';
import { POST as loginPOST } from '@/app/api/v1/auth/login/route';
import { POST as logoutPOST } from '@/app/api/v1/auth/logout/route';
import { POST as signupPOST } from '@/app/api/v1/auth/signup/route';

const mockPrisma = prisma as any;
const mockVerifyPassword = verifyUserPassword as jest.Mock;
const mockGetUserOrgs = getUserOrganizations as jest.Mock;
const mockCreateUser = createUser as jest.Mock;
const mockCreateOrg = createOrganization as jest.Mock;

function makeReq(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when email is missing', async () => {
    const res = await loginPOST(makeReq('http://localhost/api/v1/auth/login', { password: 'x' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is malformed', async () => {
    const res = await loginPOST(
      makeReq('http://localhost/api/v1/auth/login', { email: 'not-an-email', password: 'x' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 401 when credentials are invalid', async () => {
    mockVerifyPassword.mockResolvedValue(null);
    const res = await loginPOST(
      makeReq('http://localhost/api/v1/auth/login', {
        email: 'user@example.com',
        password: 'wrong',
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when user email is unverified', async () => {
    mockVerifyPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      name: 'User',
      emailVerified: false,
    });
    const res = await loginPOST(
      makeReq('http://localhost/api/v1/auth/login', {
        email: 'user@example.com',
        password: 'pw',
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 200 + session cookie on successful login', async () => {
    mockVerifyPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      name: 'User',
      emailVerified: new Date(),
    });
    mockPrisma.mfaTotp.findUnique.mockResolvedValue(null);
    mockGetUserOrgs.mockResolvedValue([
      {
        orgId: 'org-1',
        role: 'OWNER',
        org: { id: 'org-1', name: 'Acme', slug: 'acme' },
      },
    ]);

    const res = await loginPOST(
      makeReq('http://localhost/api/v1/auth/login', {
        email: 'user@example.com',
        password: 'pw',
      })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('user@example.com');
    expect(body.activeOrg.id).toBe('org-1');

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/session=mock-session-token/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('returns 403 when user has no organizations', async () => {
    mockVerifyPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      name: 'User',
      emailVerified: new Date(),
    });
    mockPrisma.mfaTotp.findUnique.mockResolvedValue(null);
    mockGetUserOrgs.mockResolvedValue([]);

    const res = await loginPOST(
      makeReq('http://localhost/api/v1/auth/login', {
        email: 'user@example.com',
        password: 'pw',
      })
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/logout', () => {
  it('returns 200 and clears the session cookie', async () => {
    const res = await logoutPOST();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    const setCookie = res.headers.get('set-cookie') || '';
    // Max-Age=0 is how the route invalidates the cookie
    expect(setCookie).toMatch(/session=/);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/signup
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/signup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when email is missing', async () => {
    const res = await signupPOST(
      makeReq('http://localhost/api/v1/auth/signup', { password: 'password123' }) as any
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 8 chars', async () => {
    const res = await signupPOST(
      makeReq('http://localhost/api/v1/auth/signup', {
        email: 'new@example.com',
        password: 'short',
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when user already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'new@example.com' });
    const res = await signupPOST(
      makeReq('http://localhost/api/v1/auth/signup', {
        email: 'new@example.com',
        password: 'validpass123',
        name: 'New User',
      }) as any
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already exists/i);
  });

  it('returns 200 and user + org on successful signup', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.org.findUnique.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue({
      id: 'u-new',
      email: 'new@example.com',
      name: 'New User',
      emailVerified: null,
    });
    mockCreateOrg.mockResolvedValue({ id: 'org-new', name: "New User's org", slug: 'new-users-org' });

    const res = await signupPOST(
      makeReq('http://localhost/api/v1/auth/signup', {
        email: 'new@example.com',
        password: 'validpass123',
        name: 'New User',
      }) as any
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('new@example.com');
    expect(body.org).toMatchObject({ id: 'org-new' });
  });
});
