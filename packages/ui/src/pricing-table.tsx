'use client';

import React from 'react';
import { usePricing } from '@governs-ai/billing/client';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Check, Sparkles, Zap, Loader2 } from 'lucide-react';

interface PricingTableProps {
  className?: string;
  showUpgradeCTA?: boolean;
  onTierSelect?: (tier: string) => void;
}

export function PricingTable({ 
  className = '', 
  showUpgradeCTA = true,
  onTierSelect 
}: PricingTableProps) {
  const { pricing, isLoading, error } = usePricing();

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading pricing...</p>
        </div>
      </div>
    );
  }

  if (error || !pricing) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-destructive mb-4">
          <p>Failed to load pricing information</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const handleTierSelect = async (tier: string) => {
    if (onTierSelect) {
      onTierSelect(tier);
      return;
    }

    // Default checkout flow
    try {
      const response = await fetch('/api/billing/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          interval: 'monthly', // Default to monthly
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/billing/cancel`,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Checkout error:', errorData);
        alert(`Failed to start checkout: ${errorData.error || 'Please try again'}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  return (
    <div className={`grid gap-6 lg:grid-cols-${pricing.tiers.length} ${className}`}>
      {pricing.tiers.map((tier) => (
        <Card 
          key={tier.tier} 
          className={`relative overflow-hidden ${
            tier.tier === 'pro' 
              ? 'border-primary shadow-lg scale-105' 
              : 'border-border'
          }`}
        >
          {tier.tier === 'pro' && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 inline mr-2" />
              Most Popular
            </div>
          )}
          
          <CardHeader className={`text-center ${tier.tier === 'pro' ? 'pt-12' : ''}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-xl font-bold capitalize">{tier.tier}</h3>
              {tier.tier === 'pro' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Zap className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              )}
            </div>
            
            <div className="mb-4">
              <span className="text-3xl font-bold">
                ${tier.price}
              </span>
              <span className="text-muted-foreground">
                /{tier.interval}
              </span>
            </div>
            
            <CardDescription className="text-sm">
              {tier.productDescription || `Perfect for ${tier.tier === 'pro' ? 'professionals' : 'getting started'}`}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            
            {showUpgradeCTA && (
              <Button 
                className={`w-full ${
                  tier.tier === 'pro' 
                    ? 'bg-primary hover:bg-primary/90' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={() => handleTierSelect(tier.tier)}
              >
                {tier.tier === 'pro' ? 'Get Pro' : 'Get Started'}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Compact variant for smaller spaces
export function CompactPricingTable({ className = '' }: { className?: string }) {
  const { pricing, isLoading, error } = usePricing();

  if (isLoading || error || !pricing) {
    return null; // Don't show loading state for compact variant
  }

  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 ${className}`}>
      {pricing.tiers.map((tier) => (
        <Card key={tier.tier} className="min-w-[280px] flex-shrink-0">
          <CardHeader className="text-center pb-3">
            <h3 className="text-lg font-semibold capitalize">{tier.tier}</h3>
            <div className="text-2xl font-bold">
              ${tier.price}
              <span className="text-sm text-muted-foreground font-normal">
                /{tier.interval}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <ul className="space-y-2 mb-4">
              {tier.features.slice(0, 5).map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              className="w-full" 
              variant={tier.tier === 'pro' ? 'default' : 'outline'}
              onClick={() => handleTierSelect(tier.tier)}
            >
              {tier.tier === 'pro' ? 'Upgrade' : 'Start Free'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Helper function for checkout (can be used outside the component)
async function handleTierSelect(tier: string) {
  try {
    const response = await fetch('/api/billing/dodo/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier,
        interval: 'monthly', // Default to monthly
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing/cancel`,
      }),
    });

    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create checkout session');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}
