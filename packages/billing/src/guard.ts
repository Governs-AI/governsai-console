import type { PrismaClient } from '@governs-ai/db';
import { getTier, Feature } from './quota';
import { createX402Response, getPaymentAmount } from './x402';
import { type PayPerUseFeature } from './entitlements';

export interface GuardOptions {
  feature?: Feature;
  incrementFeature?: number;
  requireSubscription?: boolean;
  requireTier?: 'basic' | 'pro';
  customMessage?: string;
  // x402 options
  enableX402?: boolean;
  x402Feature?: PayPerUseFeature;
}

export interface GuardResult {
  allowed: boolean;
  error?: string;
  status?: number;
  data?: any;
  x402Response?: Response;
}

// Basic subscription guard
export async function guardSubscription(
  prisma: PrismaClient,
  userId: string,
  options: GuardOptions = {}
): Promise<GuardResult> {
  try {
    const tier = await getTier(prisma, userId);
    
    // Check if user has required tier
    if (options.requireTier && tier !== options.requireTier && tier !== 'pro') {
      return {
        allowed: false,
        error: options.customMessage || `This feature requires ${options.requireTier} tier or higher`,
        status: 402,
        data: { requiredTier: options.requireTier, currentTier: tier }
      };
    }
    
    // Check if user has active subscription
    if (options.requireSubscription && tier === 'free') {
      return {
        allowed: false,
        error: options.customMessage || 'This feature requires an active subscription',
        status: 402,
        data: { currentTier: tier }
      };
    }
    
    // Check feature quota if specified
    if (options.feature) {
      // For now, we'll skip quota checking since assertQuota was removed
      // This can be reimplemented later if needed
      
      // If x402 is enabled and user is on free tier, return payment required response
      if (options.enableX402 && options.x402Feature && tier === 'free') {
        const amount = getPaymentAmount(options.x402Feature);
        const x402Response = createX402Response({
          feature: options.x402Feature,
          amount,
          currency: 'USD'
        });
        
        return {
          allowed: false,
          error: `Payment of $${amount} required for ${options.x402Feature}`,
          status: 402,
          data: { 
            feature: options.feature, 
            tier,
            x402Feature: options.x402Feature,
            paymentAmount: amount
          },
          x402Response
        };
      }
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Guard error:', error);
    return {
      allowed: false,
      error: 'Internal server error',
      status: 500
    };
  }
}

// Route protection helper
export async function protectRoute(
  prisma: PrismaClient,
  userId: string,
  options: GuardOptions = {}
): Promise<{ error: string; status: number; data: any } | null> {
  const result = await guardSubscription(prisma, userId, options);
  
  if (!result.allowed) {
    return {
      error: result.error || 'Access denied',
      status: result.status || 403,
      data: result.data
    };
  }
  
  return null;
}

// Create a route guard function
export function createRouteGuard(options: GuardOptions = {}) {
  return async (prisma: PrismaClient, userId: string) => {
    return protectRoute(prisma, userId, options);
  };
}

// Predefined guards for common scenarios
export const guards = {
  // Require Pro subscription
  requirePro: createRouteGuard({ requireTier: 'pro' }),
  
  // Require any subscription (basic or pro)
  requireSubscription: createRouteGuard({ requireSubscription: true }),
  
  // Check interview quota
  checkInterviewQuota: createRouteGuard({ feature: 'interviews_per_week' }),
  
  // Check video quota
  checkVideoQuota: createRouteGuard({ feature: 'video_minutes_per_week' }),
  
  // Check resume export quota
  checkResumeExportQuota: createRouteGuard({ feature: 'resume_exports_per_month' }),
  
  // Check auto-apply quota
  checkAutoApplyQuota: createRouteGuard({ feature: 'auto_apply_per_month' }),
  
  // Check job matches quota
  checkJobMatchesQuota: createRouteGuard({ feature: 'job_matches_per_day' }),
  
  // Check stored resumes quota
  checkStoredResumesQuota: createRouteGuard({ feature: 'stored_resumes' }),
  
  // Check saved jobs quota
  checkSavedJobsQuota: createRouteGuard({ feature: 'saved_jobs' }),

  // x402 pay-per-use guards
  checkResumeExportWithX402: createRouteGuard({ 
    feature: 'resume_exports_per_month',
    enableX402: true,
    x402Feature: 'resume_export'
  }),
  
  checkTextInterviewWithX402: createRouteGuard({ 
    feature: 'interviews_per_week',
    enableX402: true,
    x402Feature: 'interview_text'
  }),
  
  checkChatInterviewWithX402: createRouteGuard({ 
    feature: 'interviews_per_week',
    enableX402: true,
    x402Feature: 'interview_chat'
  }),
  
  checkVideoInterviewWithX402: createRouteGuard({ 
    feature: 'video_minutes_per_week',
    enableX402: true,
    x402Feature: 'interview_video'
  }),
};
