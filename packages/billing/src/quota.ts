import { ENTITLEMENTS, FEATURE_PERIOD, Tier, Feature } from './entitlements';
import { 
  getSubscriptionByUserId, 
  getInterviewCount, 
  getUserActivityCount, 
  getUserActivitySum 
} from '@governs-ai/db';

export type { Tier, Feature } from './entitlements';

export interface QuotaStatus {
  feature: Feature;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isUnlimited: boolean;
  tier: Tier;
  period: string;
}

export interface SubscriptionStatus {
  tier: Tier;
  isActive: boolean;
  currentPeriodEnd?: Date;
  features: Record<Feature, QuotaStatus>;
}

// Get user's current tier based on subscription status
export async function getTier(prisma: any, userId: string): Promise<Tier> {
  try {
    const sub = await getSubscriptionByUserId(prisma, userId);
    return (sub?.tier as Tier) || 'free';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free';
  }
}

// Get usage for a specific feature
export async function getUsage(prisma: any, userId: string, feature: Feature): Promise<number> {
  const tier = await getTier(prisma, userId);
  const period = FEATURE_PERIOD[feature];
  
  try {
    switch (feature) {
      case 'interviews_per_week': {
        // Count interviews created in the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const interviewCount = await getInterviewCount(prisma, userId, weekAgo);
        return interviewCount;
      }

      case 'video_minutes_per_week': {
        // Count video minutes from UserActivity in the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const videoMinutes = await getUserActivitySum(prisma, userId, 'video_interview', weekAgo);
        return Math.floor((videoMinutes._sum.points || 0) / 60); // Convert seconds to minutes
      }

      case 'resume_exports_per_month': {
        // Count resume exports in the last 30 days
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const exportCount = await getUserActivityCount(prisma, userId, 'resume_export', monthAgo);
        return exportCount;
      }

      case 'auto_apply_per_month': {
        // Count auto-apply actions in the last 30 days
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const autoApplyCount = await getUserActivityCount(prisma, userId, 'auto_apply', monthAgo);
        return autoApplyCount;
      }

      case 'job_matches_per_day': {
        // Count job matches today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const jobMatchCount = await getUserActivityCount(prisma, userId, 'job_match', today);
        return jobMatchCount;
      }

      case 'stored_resumes':
        // Count stored resumes (this would need a Resume model)
        // For now, return 0 as placeholder
        return 0;

      case 'saved_jobs':
        // Count saved jobs (this would need a SavedJob model)
        // For now, return 0 as placeholder
        return 0;

      case 'analysis_depth':
        // Analysis depth is a tier-based feature, not usage-based
        return 0;

      default:
        return 0;
    }
  } catch (error) {
    console.error(`Error getting usage for ${feature}:`, error);
    return 0;
  }
}

// Check if an action is allowed based on quota
export async function assertQuota(prisma: any, userId: string, feature: Feature): Promise<boolean> {
  const tier = await getTier(prisma, userId);
  const limit = ENTITLEMENTS[feature][tier];
  
  if (limit === Infinity) {
    return true;
  }
  
  const used = await getUsage(prisma, userId, feature);
  return used < (limit as number);
}

// Get comprehensive quota status for a feature
export async function getQuotaStatus(prisma: any, userId: string, feature: Feature): Promise<QuotaStatus> {
  const tier = await getTier(prisma, userId);
  const used = await getUsage(prisma, userId, feature);
  const limit = ENTITLEMENTS[feature][tier];
  const period = FEATURE_PERIOD[feature];
  
  const isUnlimited = limit === Infinity;
  const numericLimit = isUnlimited ? 0 : (limit as number);
  const remaining = isUnlimited ? -1 : Math.max(0, numericLimit - used);
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((used / numericLimit) * 100));
  
  return {
    feature,
    used,
    limit: numericLimit,
    remaining,
    percentage,
    isUnlimited,
    tier,
    period: period === 'NA' ? 'unlimited' : period.toLowerCase(),
  };
}

// Get comprehensive subscription status
export async function getSubscriptionStatus(prisma: any, userId: string): Promise<SubscriptionStatus> {
  const tier = await getTier(prisma, userId);
  const subscription = await getSubscriptionByUserId(prisma, userId);

  const features: Record<Feature, QuotaStatus> = {} as Record<Feature, QuotaStatus>;
  
  // Get quota status for all features
  const featureKeys: Feature[] = [
    'interviews_per_week',
    'video_minutes_per_week', 
    'resume_exports_per_month',
    'auto_apply_per_month',
    'job_matches_per_day',
    'analysis_depth',
    'stored_resumes',
    'saved_jobs'
  ];
  
  for (const feature of featureKeys) {
    features[feature] = await getQuotaStatus(prisma, userId, feature);
  }

  return {
    tier,
    isActive: tier === 'pro',
    currentPeriodEnd: subscription?.currentPeriodEnd || undefined,
    features,
  };
}
