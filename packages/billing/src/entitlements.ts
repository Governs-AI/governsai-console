export type Tier = 'free' | 'basic' | 'pro';
export type PaymentType = 'subscription' | 'pay_per_use';

export const ENTITLEMENTS = {
  interviews_per_week:      { free: 2,   basic: 10,  pro: Infinity },
  video_minutes_per_week:   { free: 10,  basic: 60,  pro: 240 },
  resume_exports_per_month: { free: 2,   basic: 10,  pro: 20 },
  auto_apply_per_month:     { free: 3,   basic: 25,  pro: 100 },
  job_matches_per_day:      { free: 50,  basic: 200, pro: 1000 },
  analysis_depth:           { free: 'summary', basic: 'detailed', pro: 'full' },
  stored_resumes:           { free: 1,   basic: 3,   pro: 10 },
  saved_jobs:               { free: 20,  basic: 100, pro: 200 },
} as const;

// Pay-per-use pricing in USD
export const PAY_PER_USE_PRICING = {
  resume_export: 0.25,           // $0.25 per resume export
  interview_text: 0.25,          // $0.25 per text interview
  interview_chat: 0.50,          // $0.50 per chat interview  
  interview_video: 0.50,         // $0.50 per video interview
} as const;

export type PayPerUseFeature = keyof typeof PAY_PER_USE_PRICING;

export const FEATURE_PERIOD: Record<keyof typeof ENTITLEMENTS, 'DAILY'|'WEEKLY'|'MONTHLY'|'NA'> = {
  interviews_per_week:      'WEEKLY',
  video_minutes_per_week:   'WEEKLY',
  resume_exports_per_month: 'MONTHLY',
  auto_apply_per_month:     'MONTHLY',
  job_matches_per_day:      'DAILY',
  analysis_depth:           'NA',
  stored_resumes:           'NA',
  saved_jobs:               'NA',
};

export type Feature = keyof typeof ENTITLEMENTS;

// Helper to get limit for a specific tier and feature
export function getLimit(tier: Tier, feature: Feature): number | string {
  return ENTITLEMENTS[feature][tier];
}

// Helper to check if a feature is unlimited for a tier
export function isUnlimited(tier: Tier, feature: Feature): boolean {
  const limit = getLimit(tier, feature);
  return typeof limit === 'number' && limit === Infinity;
}

// Helper to get human-readable limit description
export function getLimitDescription(tier: Tier, feature: Feature): string {
  const limit = getLimit(tier, feature);
  if (typeof limit === 'string') return limit;
  if (limit === Infinity) return 'Unlimited';
  
  const period = FEATURE_PERIOD[feature];
  if (period === 'DAILY') return `${limit} per day`;
  if (period === 'WEEKLY') return `${limit} per week`;
  if (period === 'MONTHLY') return `${limit} per month`;
  return `${limit}`;
}
