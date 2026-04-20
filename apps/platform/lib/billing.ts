export type SelfServeBillingTier = 'starter' | 'growth';
export type OrgBillingTier = 'free' | 'starter' | 'growth' | 'enterprise' | 'restricted';
export type BillingStatus = 'inactive' | 'active' | 'canceled';

export interface BillingPlan {
  tier: SelfServeBillingTier;
  name: string;
  priceMonthly: string;
  amountCents: number;
  description: string;
  highlights: string[];
}

export const SELF_SERVE_BILLING_PLANS: Record<SelfServeBillingTier, BillingPlan> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    priceMonthly: '$499/mo',
    amountCents: 49900,
    description: 'Operational governance for teams standardizing AI usage across one org.',
    highlights: [
      'Policy controls and audit trail',
      'Usage visibility and budget alerts',
      'Fast setup for a single production workspace',
    ],
  },
  growth: {
    tier: 'growth',
    name: 'Growth',
    priceMonthly: '$2,500/mo',
    amountCents: 250000,
    description: 'Expanded governance coverage for production rollouts and multi-team operations.',
    highlights: [
      'Higher-volume governance workflows',
      'Advanced rollout support across teams',
      'Best fit for central platform ownership',
    ],
  },
};

export const ENTERPRISE_PLAN = {
  tier: 'enterprise' as const,
  name: 'Enterprise',
  priceMonthly: 'Custom',
  description: 'Custom contracting for SSO, procurement, and dedicated rollout support.',
  highlights: [
    'Security and procurement alignment',
    'Enterprise onboarding and architecture review',
    'Custom plan design for larger deployments',
  ],
};

export function isSelfServeBillingTier(value: string): value is SelfServeBillingTier {
  return value === 'starter' || value === 'growth';
}

export function getBillingPlan(tier: string): BillingPlan | null {
  return isSelfServeBillingTier(tier) ? SELF_SERVE_BILLING_PLANS[tier] : null;
}
