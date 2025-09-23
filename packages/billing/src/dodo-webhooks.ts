import { PrismaClient } from '@governs-ai/db';
import { 
  DodoWebhookEvent, 
  DodoSubscription, 
  DodoPayment,
  DodoWebhookEventType 
} from './dodo-types';

export async function handleDodoEvent(event: DodoWebhookEvent, prisma: PrismaClient): Promise<void> {
  console.log(`Processing Dodo webhook event: ${event.type}`, event);

  try {
    switch (event.type) {
      case 'subscription.active':
        await handleSubscriptionActive(event.data, prisma);
        break;
      case 'subscription.renewed':
        await handleSubscriptionRenewed(event.data, prisma);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data, prisma);
        break;
      case 'payment.succeeded':
        await handlePaymentSucceeded(event.data, prisma);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.data, prisma);
        break;
      default:
        console.log(`Unhandled Dodo webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing Dodo webhook event ${event.type}:`, error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: DodoSubscription, prisma: PrismaClient): Promise<void> {
  console.log('Handling subscription created:', subscription);

  try {
    // Find the user by the custom data
    const userId = subscription.custom_data?.userId;
    if (!userId) {
      console.error('No userId found in subscription custom data');
      return;
    }

    // Determine the tier based on product ID
    const tier = determineTierFromProductId(subscription.product_id);

    // Find existing subscription or create new one
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        provider: 'dodo',
        subscriptionId: subscription.id,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          tier,
          status: mapDodoStatusToInternal(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start),
          currentPeriodEnd: new Date(subscription.current_period_end),
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at) : null,
          pausedAt: subscription.paused_at ? new Date(subscription.paused_at) : null,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new subscription with required fields
      await prisma.subscription.create({
        data: {
          userId,
          provider: 'dodo',
          subscriptionId: subscription.id,
          customerId: subscription.customer_id,
          tier,
          status: mapDodoStatusToInternal(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start),
          currentPeriodEnd: new Date(subscription.current_period_end),
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at) : null,
          pausedAt: subscription.paused_at ? new Date(subscription.paused_at) : null,
          // Required fields with default values
          purchaseId: `dodo_${subscription.id}`,
          email: subscription.customer_id, // Using customer_id as email for now
          licenseKey: `dodo_${subscription.id}_${Date.now()}`,
          saleId: `sale_${subscription.id}`,
          price: 0, // Will be updated from payment data
          currency: 'USD',
          productId: subscription.product_id,
          productName: `Dodo ${tier} Plan`,
          productPermalink: `dodo-${tier}`,
          purchaseDate: new Date(),
          orderId: `order_${subscription.id}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    console.log(`Subscription created/updated for user ${userId} with tier ${tier}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: DodoSubscription, prisma: PrismaClient): Promise<void> {
  console.log('Handling subscription updated:', subscription);

  try {
    const userId = subscription.custom_data?.userId;
    if (!userId) {
      console.error('No userId found in subscription custom data');
      return;
    }

    const tier = determineTierFromProductId(subscription.product_id);

    await prisma.subscription.updateMany({
      where: {
        userId,
        provider: 'dodo',
        subscriptionId: subscription.id,
      },
      data: {
        tier,
        status: mapDodoStatusToInternal(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start),
        currentPeriodEnd: new Date(subscription.current_period_end),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at) : null,
        pausedAt: subscription.paused_at ? new Date(subscription.paused_at) : null,
        updatedAt: new Date(),
      },
    });

    console.log(`Subscription updated for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(subscription: DodoSubscription, prisma: PrismaClient): Promise<void> {
  console.log('Handling subscription canceled:', subscription);

  try {
    const userId = subscription.custom_data?.userId;
    if (!userId) {
      console.error('No userId found in subscription custom data');
      return;
    }

    await prisma.subscription.updateMany({
      where: {
        userId,
        provider: 'dodo',
        subscriptionId: subscription.id,
      },
      data: {
        status: 'canceled',
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at) : new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`Subscription canceled for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
    throw error;
  }
}

async function handlePaymentCompleted(payment: DodoPayment, prisma: PrismaClient): Promise<void> {
  console.log('Handling payment completed:', payment);

  try {
    // Log the payment for audit purposes
    await prisma.transaction.create({
      data: {
        provider: 'dodo',
        userId: payment.customer.email, // Using email as userId for now
        amount: Math.round(payment.amount * 100), // Convert to cents
        currency: payment.currency,
        status: 'succeeded',
        paidAt: payment.completed_at ? new Date(payment.completed_at) : new Date(),
        metadata: {
          paymentId: payment.id,
          customerEmail: payment.customer.email,
        },
      },
    });

    console.log(`Payment completed logged: ${payment.id}`);
  } catch (error) {
    console.error('Error handling payment completed:', error);
    throw error;
  }
}

async function handlePaymentFailed(payment: DodoPayment, prisma: PrismaClient): Promise<void> {
  console.log('Handling payment failed:', payment);

  try {
    // Log the failed payment
    await prisma.transaction.create({
      data: {
        provider: 'dodo',
        userId: payment.customer.email, // Using email as userId for now
        amount: Math.round(payment.amount * 100), // Convert to cents
        currency: payment.currency,
        status: 'failed',
        metadata: {
          paymentId: payment.id,
          customerEmail: payment.customer.email,
        },
      },
    });

    console.log(`Payment failed logged: ${payment.id}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

// Helper function to determine tier from product ID
function determineTierFromProductId(productId: string): string {
  const basicProductId = process.env.DODO_PRODUCT_BASIC;
  const proProductId = process.env.DODO_PRODUCT_PRO;

  if (productId === basicProductId) return 'basic';
  if (productId === proProductId) return 'pro';
  
  // Default to basic if we can't determine
  console.warn(`Unknown product ID: ${productId}, defaulting to basic tier`);
  return 'basic';
}

// Helper function to map Dodo status to internal status
function mapDodoStatusToInternal(dodoStatus: string): string {
  switch (dodoStatus) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    case 'trialing':
      return 'trialing';
    case 'paused':
      return 'paused';
    default:
      console.warn(`Unknown Dodo status: ${dodoStatus}, defaulting to active`);
      return 'active';
  }
}

// Handle subscription.active - when subscription becomes active
async function handleSubscriptionActive(subscription: any, prisma: PrismaClient): Promise<void> {
  console.log('Handling subscription active:', subscription);

  try {
    // Extract user info from customer data
    const customerEmail = subscription.customer?.email;
    if (!customerEmail) {
      console.error('No customer email found in subscription data');
      return;
    }

    // Determine the tier based on product ID
    const tier = determineTierFromProductId(subscription.product_id);

    // Find user by email (since we don't have custom_data in real webhook)
    const user = await prisma.user.findFirst({
      where: { email: customerEmail }
    });

    if (!user) {
      console.error(`User not found for email: ${customerEmail}`);
      return;
    }

    // Find existing subscription or create new one
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        provider: 'dodo',
        subscriptionId: subscription.subscription_id,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          subscriptionId: subscription.subscription_id,
          customerId: subscription.customer?.id || '',
          tier: tier,
          status: mapDodoStatusToInternal(subscription.status),
          currentPeriodStart: new Date(subscription.created_at),
          currentPeriodEnd: new Date(subscription.next_billing_date),
          updatedAt: new Date()
        }
      });
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId: user.id,
          provider: 'dodo',
          subscriptionId: subscription.subscription_id,
          customerId: subscription.customer?.id || '',
          tier: tier,
          status: mapDodoStatusToInternal(subscription.status),
          currentPeriodStart: new Date(subscription.created_at),
          currentPeriodEnd: new Date(subscription.next_billing_date),
          purchaseId: subscription.subscription_id,
          email: customerEmail,
          licenseKey: `dodo_${subscription.subscription_id}`,
          saleId: subscription.subscription_id,
          price: subscription.recurring_pre_tax_amount || 0,
          currency: subscription.currency || 'USD',
          productId: subscription.product_id,
          productName: `Dodo ${tier} Plan`,
          productPermalink: `https://dodopayments.com/products/${subscription.product_id}`,
          purchaseDate: new Date(subscription.created_at),
          orderId: subscription.subscription_id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log('Subscription active handled successfully');
  } catch (error) {
    console.error('Error handling subscription active:', error);
    throw error;
  }
}

// Handle subscription.renewed - when subscription renews
async function handleSubscriptionRenewed(subscription: any, prisma: PrismaClient): Promise<void> {
  console.log('Handling subscription renewed:', subscription);

  try {
    const customerEmail = subscription.customer?.email;
    if (!customerEmail) {
      console.error('No customer email found in subscription data');
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email: customerEmail }
    });

    if (!user) {
      console.error(`User not found for email: ${customerEmail}`);
      return;
    }

    // Update subscription with new billing period
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        provider: 'dodo',
        subscriptionId: subscription.subscription_id
      },
      data: {
        currentPeriodStart: new Date(subscription.previous_billing_date),
        currentPeriodEnd: new Date(subscription.next_billing_date),
        updatedAt: new Date()
      }
    });

    console.log('Subscription renewed handled successfully');
  } catch (error) {
    console.error('Error handling subscription renewed:', error);
    throw error;
  }
}

// Handle subscription.cancelled - when subscription is cancelled
async function handleSubscriptionCancelled(subscription: any, prisma: PrismaClient): Promise<void> {
  console.log('Handling subscription cancelled:', subscription);

  try {
    const customerEmail = subscription.customer?.email;
    if (!customerEmail) {
      console.error('No customer email found in subscription data');
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email: customerEmail }
    });

    if (!user) {
      console.error(`User not found for email: ${customerEmail}`);
      return;
    }

    // Update subscription status to cancelled
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        provider: 'dodo',
        subscriptionId: subscription.subscription_id
      },
      data: {
        status: 'canceled',
        canceledAt: new Date(subscription.cancelled_at || new Date()),
        updatedAt: new Date()
      }
    });

    console.log('Subscription cancelled handled successfully');
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
    throw error;
  }
}

// Handle payment.succeeded - when payment succeeds
async function handlePaymentSucceeded(payment: any, prisma: PrismaClient): Promise<void> {
  console.log('Handling payment succeeded:', payment);

  try {
    const customerEmail = payment.customer?.email;
    if (!customerEmail) {
      console.error('No customer email found in payment data');
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email: customerEmail }
    });

    if (!user) {
      console.error(`User not found for email: ${customerEmail}`);
      return;
    }

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        provider: 'dodo',
        chargeId: payment.payment_id,
        subscriptionId: payment.subscription_id,
        amount: payment.total_amount,
        currency: payment.currency,
        status: payment.status,
        metadata: { paymentMethod: payment.payment_method },
        createdAt: new Date(payment.created_at)
      }
    });

    console.log('Payment succeeded handled successfully');
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}
