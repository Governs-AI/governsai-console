'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Loader2 } from 'lucide-react';

interface DodoCheckoutProps {
  priceId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  tier: 'basic' | 'pro';
  interval: 'monthly' | 'yearly';
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function DodoCheckout({
  priceId,
  userId,
  userEmail,
  userName,
  tier,
  interval,
  onSuccess,
  onError,
  onClose,
  className,
  children,
  disabled = false,
}: DodoCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);

  const openCheckout = async () => {
    setIsLoading(true);

    try {
      // Create payment link via API
      const response = await fetch('/api/billing/dodo/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          interval,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          customData: {
            tier,
            interval,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment link');
      }

      const { paymentLink } = await response.json();

      // Redirect to Dodo payment link
      window.location.href = paymentLink;
    } catch (error) {
      console.error('Error opening Dodo checkout:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={openCheckout}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children || `Subscribe to ${tier} (${interval})`
      )}
    </Button>
  );
}
