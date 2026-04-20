import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/session', () => ({
  requireAuth: jest.fn(),
}));

const mockCreateSession = jest.fn();

jest.mock('stripe', () => {
  const Stripe = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCreateSession,
      },
    },
  }));

  return {
    __esModule: true,
    default: Stripe,
  };
}, { virtual: true });

import { requireAuth } from '@/lib/session';
import { POST } from '@/app/api/v1/billing/checkout/route';

const mockAuth = requireAuth as jest.Mock;
const mockPrisma = prisma as any;
const AUTH_CTX = { orgId: 'org-1', userId: 'user-1', roles: ['OWNER'], orgSlug: 'acme', session: {} };

function makeReq(body?: unknown) {
  return new NextRequest('http://localhost/api/v1/billing/checkout', {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json' },
  });
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3002';
  process.env.STRIPE_SECRET_KEY = 'sk_test_billing_ci';
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('POST /api/v1/billing/checkout', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockRejectedValue(new Error('Authentication required'));

    const res = await POST(makeReq({ tier: 'starter' }));

    expect(res.status).toBe(401);
  });

  it('returns 400 for unsupported tiers', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);

    const res = await POST(makeReq({ tier: 'enterprise' }));

    expect(res.status).toBe(400);
  });

  it('returns 503 when Stripe billing is not configured', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.org.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      billingTier: 'free',
      billingStatus: 'inactive',
      stripeCustomerId: null,
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner',
    });
    delete process.env.STRIPE_SECRET_KEY;

    const res = await POST(makeReq({ tier: 'starter' }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: 'billing not configured' });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('returns 200 with a url field for a valid tier', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.org.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      billingTier: 'free',
      billingStatus: 'inactive',
      stripeCustomerId: null,
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner',
    });
    mockCreateSession.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });

    const res = await POST(makeReq({ tier: 'starter' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'org-1',
        customer_email: 'owner@example.com',
        metadata: expect.objectContaining({
          orgId: 'org-1',
          tier: 'starter',
          initiatedBy: 'user-1',
        }),
      })
    );
  });

  it('returns 409 when the requested plan is already active', async () => {
    mockAuth.mockResolvedValue(AUTH_CTX);
    mockPrisma.org.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      billingTier: 'growth',
      billingStatus: 'active',
      stripeCustomerId: 'cus_123',
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'owner@example.com', name: 'Owner' });

    const res = await POST(makeReq({ tier: 'growth' }));

    expect(res.status).toBe(409);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
