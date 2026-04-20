import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

const mockConstructEvent = jest.fn();

class StripeSignatureVerificationError extends Error {}

jest.mock('stripe', () => {
  const Stripe = jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));

  (Stripe as any).errors = {
    StripeSignatureVerificationError,
  };

  return {
    __esModule: true,
    default: Stripe,
  };
});

import { POST } from '@/app/api/v1/billing/webhook/route';

const mockPrisma = prisma as any;

function makeReq(payload: string, signature = 't=1,v1=abc') {
  return new NextRequest('http://localhost/api/v1/billing/webhook', {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/billing/webhook', () => {
  it('returns 400 when Stripe signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new StripeSignatureVerificationError('invalid signature');
    });

    const res = await POST(makeReq('{}'));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid Stripe signature');
  });

  it('activates the organization when checkout completes', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          client_reference_id: 'org-1',
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: {
            orgId: 'org-1',
            tier: 'starter',
          },
        },
      },
    });
    mockPrisma.org.update.mockResolvedValue({});

    const res = await POST(makeReq('{"type":"checkout.session.completed"}'));

    expect(res.status).toBe(200);
    expect(mockPrisma.org.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: {
        billingTier: 'starter',
        billingStatus: 'active',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      },
    });
  });

  it('restricts the organization when a subscription is deleted', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          metadata: {},
        },
      },
    });
    mockPrisma.org.findFirst.mockResolvedValue({ id: 'org-1' });
    mockPrisma.org.update.mockResolvedValue({});

    const res = await POST(makeReq('{"type":"customer.subscription.deleted"}'));

    expect(res.status).toBe(200);
    expect(mockPrisma.org.findFirst).toHaveBeenCalled();
    expect(mockPrisma.org.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: {
        billingTier: 'restricted',
        billingStatus: 'canceled',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: null,
      },
    });
  });
});
