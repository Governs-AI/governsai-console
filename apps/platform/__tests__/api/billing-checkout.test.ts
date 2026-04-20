import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/session', () => ({
  requireRole: jest.fn(),
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
});

import { requireRole } from '@/lib/session';
import { POST } from '@/app/api/v1/billing/checkout/route';

const mockRequireRole = requireRole as jest.Mock;
const mockPrisma = prisma as any;
const AUTH_CTX = { orgId: 'org-1', userId: 'user-1', roles: ['OWNER'], orgSlug: 'acme', session: {} };

function makeReq(body?: unknown) {
  return new NextRequest('http://localhost/api/v1/billing/checkout', {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3002';
});

describe('POST /api/v1/billing/checkout', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequireRole.mockRejectedValue(new Error('Authentication required'));

    const res = await POST(makeReq({ tier: 'starter', seats: 1 }));

    expect(res.status).toBe(401);
  });

  it('returns 400 for unsupported tiers', async () => {
    mockRequireRole.mockResolvedValue(AUTH_CTX);

    const res = await POST(makeReq({ tier: 'enterprise', seats: 1 }));

    expect(res.status).toBe(400);
  });

  it('creates a Stripe checkout session for Starter with the requested seat count', async () => {
    mockRequireRole.mockResolvedValue(AUTH_CTX);
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

    const res = await POST(makeReq({ tier: 'starter', seats: 3 }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'org-1',
        customer_email: 'owner@example.com',
        success_url: 'http://localhost:3002/o/acme/pricing?checkout=success&tier=starter',
        cancel_url: 'http://localhost:3002/o/acme/pricing?checkout=canceled&tier=starter',
        metadata: expect.objectContaining({
          orgId: 'org-1',
          tier: 'starter',
          initiatedBy: 'user-1',
        }),
        line_items: [
          expect.objectContaining({
            quantity: 3,
          }),
        ],
      })
    );
  });

  it('returns 409 when the requested plan is already active', async () => {
    mockRequireRole.mockResolvedValue(AUTH_CTX);
    mockPrisma.org.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      billingTier: 'growth',
      billingStatus: 'active',
      stripeCustomerId: 'cus_123',
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'owner@example.com', name: 'Owner' });

    const res = await POST(makeReq({ tier: 'growth', seats: 1 }));

    expect(res.status).toBe(409);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('returns 503 when billing is not configured', async () => {
    const originalSecret = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const res = await POST(makeReq({ tier: 'starter', seats: 1 }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'billing not configured' });

    process.env.STRIPE_SECRET_KEY = originalSecret;
  });

  it('returns 403 when the user is not an owner', async () => {
    mockRequireRole.mockRejectedValue(new Error('Role OWNER required'));

    const res = await POST(makeReq({ tier: 'starter', seats: 1 }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Owner role required' });
  });
});
