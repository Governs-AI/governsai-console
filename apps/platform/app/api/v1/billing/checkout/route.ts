import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@governs-ai/db';
import { getBillingPlan } from '@/lib/billing';
import { getValidAppUrl } from '@/lib/constants';

const checkoutSchema = z.object({
  tier: z.enum(['starter', 'growth']),
});

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  return new Stripe(secretKey);
}

export async function POST(request: NextRequest) {
  try {
    const { requireAuth } = await import('@/lib/session');
    const { orgId, userId } = await requireAuth(request);
    const body = checkoutSchema.parse(await request.json());
    const plan = getBillingPlan(body.tier);

    if (!plan) {
      return NextResponse.json({ error: 'Unsupported billing tier' }, { status: 400 });
    }

    const [org, user] = await Promise.all([
      prisma.org.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          slug: true,
          billingTier: true,
          billingStatus: true,
          stripeCustomerId: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      }),
    ]);

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (org.billingTier === plan.tier && org.billingStatus === 'active') {
      return NextResponse.json(
        { error: `${plan.name} is already active for this organization` },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const baseUrl = getValidAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      billing_address_collection: 'auto',
      allow_promotion_codes: false,
      client_reference_id: org.id,
      customer: org.stripeCustomerId || undefined,
      customer_email: org.stripeCustomerId ? undefined : user?.email || undefined,
      success_url: `${baseUrl}/pricing?checkout=success&tier=${plan.tier}`,
      cancel_url: `${baseUrl}/pricing?checkout=canceled&tier=${plan.tier}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            unit_amount: plan.amountCents,
            product_data: {
              name: `GovernsAI ${plan.name}`,
              description: plan.description,
            },
          },
        },
      ],
      metadata: {
        orgId: org.id,
        orgSlug: org.slug,
        tier: plan.tier,
        initiatedBy: userId,
        initiatedByEmail: user?.email || '',
      },
      subscription_data: {
        metadata: {
          orgId: org.id,
          orgSlug: org.slug,
          tier: plan.tier,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe checkout session did not return a redirect URL' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      redirectUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
