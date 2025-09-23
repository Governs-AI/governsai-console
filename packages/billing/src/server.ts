import { 
  getSubscriptionByUserId,
  upsertSubscription,
  updateSubscriptionStatus,
  createPaymentEvent,
  createTransaction
} from '@governs-ai/db';
import { getTier } from './quota';

export async function hasActiveSub(prisma: any, userId: string, feature?: string): Promise<boolean> {
  try {
    const tier = await getTier(prisma, userId);
    return tier === 'pro';
  } catch (error) {
    console.error('Error checking active subscription:', error);
    return false;
  }
}

export async function syncSubscriptionFromEvent(provider: string, eventId: string, prisma: any) {
  // This function can be extended for other providers later
  if (provider === 'coinbase' || provider === 'lemonsqueezy' || provider === 'x402') {
    // For other providers, we handle events in their respective webhook handlers
    // This is a placeholder for future provider integrations
    return;
  }
  
  throw new Error(`Provider ${provider} not yet implemented`);
}
