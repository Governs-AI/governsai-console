'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tier, Feature, ENTITLEMENTS } from './entitlements';

export interface SubscriptionStatus {
  isActive: boolean;
  tier: Tier;
  currentPeriodEnd?: Date;
  isLoading: boolean;
  error?: string;
}

export interface QuotaStatus {
  feature: Feature;
  tier: Tier;
  used: number;
  limit: number | string;
  remaining: number;
  isUnlimited: boolean;
  percentageUsed: number;
  isLoading: boolean;
  error?: string;
}

export interface PricingTier {
  tier: string;
  lookupKey: string;
  priceId: string;
  price: string;
  currency: string;
  interval: string;
  productName: string;
  productDescription: string;
  features: string[];
}

export interface PricingData {
  tiers: PricingTier[];
  currency: string;
  interval: string;
}

export function useSubscription(): SubscriptionStatus {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
    tier: 'free',
    isLoading: true,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) {
      setSubscription({ isActive: false, tier: 'free', isLoading: false });
      return;
    }

    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/billing/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscription({
            isActive: data.isActive,
            tier: data.tier,
            currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : undefined,
            isLoading: false,
          });
        } else {
          throw new Error('Failed to fetch subscription');
        }
      } catch (error) {
        setSubscription({
          isActive: false,
          tier: 'free',
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    fetchSubscription();
  }, [session, status]);

  return subscription;
}

export function useQuota(feature: Feature): QuotaStatus {
  const { data: session, status } = useSession();
  const [quota, setQuota] = useState<QuotaStatus>({
    feature,
    tier: 'free',
    used: 0,
    limit: ENTITLEMENTS[feature].free,
    remaining: 0,
    isUnlimited: false,
    percentageUsed: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) {
      setQuota(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchQuota = async () => {
      try {
        const response = await fetch(`/api/billing/quota?feature=${feature}`);
        if (response.ok) {
          const data = await response.json();
          setQuota({
            feature,
            tier: data.tier,
            used: data.used,
            limit: data.limit,
            remaining: data.remaining,
            isUnlimited: data.isUnlimited,
            percentageUsed: data.percentageUsed,
            isLoading: false,
          });
        } else {
          throw new Error('Failed to fetch quota');
        }
      } catch (error) {
        setQuota(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    fetchQuota();
  }, [session, status, feature]);

  return quota;
}

// Hook for fetching dynamic pricing information
export function usePricing(): {
  pricing: PricingData | null;
  isLoading: boolean;
  error?: string;
} {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/billing/pricing');
        
        if (response.ok) {
          const data = await response.json();
          setPricing(data);
        } else {
          throw new Error('Failed to fetch pricing');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricing();
  }, []);

  return { pricing, isLoading, error };
}

// Hook for checking if a feature is available
export function useFeatureAccess(feature: Feature): {
  hasAccess: boolean;
  isLoading: boolean;
  error?: string;
} {
  const quota = useQuota(feature);
  
  return {
    hasAccess: quota.isUnlimited || quota.remaining > 0,
    isLoading: quota.isLoading,
    error: quota.error,
  };
}

// Hook for getting upgrade CTA information
export function useUpgradeCTA(feature: Feature): {
  needsUpgrade: boolean;
  currentTier: Tier;
  upgradeReason: string;
  isLoading: boolean;
} {
  const quota = useQuota(feature);
  
  const needsUpgrade = quota.tier === 'free' && !quota.isUnlimited && quota.remaining === 0;
  const upgradeReason = needsUpgrade 
    ? `You've used all ${quota.limit} ${feature.replace(/_/g, ' ')} for this period. Upgrade to Pro for unlimited access.`
    : '';
    
  return {
    needsUpgrade,
    currentTier: quota.tier,
    upgradeReason,
    isLoading: quota.isLoading,
  };
}
