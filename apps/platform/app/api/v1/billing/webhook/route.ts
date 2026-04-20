import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@governs-ai/db';
import { isSelfServeBillingTier } from '@/lib/billing';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  return new Stripe(secretKey);
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
  }

  return secret;
}

function getStripeId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.DeletedCustomer | null) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.id;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.orgId || session.client_reference_id;
  const tier = session.metadata?.tier;

  if (!orgId || !tier || !isSelfServeBillingTier(tier)) {
    console.warn('Stripe checkout completed without usable org metadata', {
      sessionId: session.id,
      orgId,
      tier,
    });
    return;
  }

  await prisma.org.update({
    where: { id: orgId },
    data: {
      billingTier: tier,
      billingStatus: 'active',
      stripeCustomerId: getStripeId(session.customer),
      stripeSubscriptionId: getStripeId(session.subscription),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const metadataOrgId = subscription.metadata?.orgId;
  const customerId = getStripeId(subscription.customer);

  const org =
    (metadataOrgId
      ? await prisma.org.findUnique({
          where: { id: metadataOrgId },
          select: { id: true },
        })
      : null) ||
    (await prisma.org.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscription.id },
          ...(customerId ? [{ stripeCustomerId: customerId }] : []),
        ],
      },
      select: { id: true },
    }));

  if (!org) {
    console.warn('Stripe subscription deletion could not resolve an org', {
      subscriptionId: subscription.id,
      metadataOrgId,
      customerId,
    });
    return;
  }

  await prisma.org.update({
    where: { id: org.id },
    data: {
      billingTier: 'restricted',
      billingStatus: 'canceled',
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log('Stripe webhook received unhandled event', event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });
    }

    if (error instanceof Error && error.message.toLowerCase().includes('signature')) {
      return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process Stripe webhook' },
      { status: 500 }
    );
  }
}
