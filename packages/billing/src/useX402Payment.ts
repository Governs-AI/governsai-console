"use client";

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PayPerUseFeature } from './entitlements';
import { getPaymentAmount, formatFeatureName } from './x402';

export interface UseX402PaymentOptions {
  feature: PayPerUseFeature;
  onPaymentSuccess?: () => void;
  onPaymentCancel?: () => void;
}

export interface X402PaymentState {
  isModalOpen: boolean;
  isProcessing: boolean;
  error: string | null;
  paymentAmount: number;
  featureName: string;
}

export interface X402PaymentActions {
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  handlePaymentSuccess: () => void;
  handlePaymentCancel: () => void;
  clearError: () => void;
}

export function useX402Payment(options: UseX402PaymentOptions): [X402PaymentState, X402PaymentActions] {
  const { feature, onPaymentSuccess, onPaymentCancel } = options;
  
  const [state, setState] = useState<X402PaymentState>({
    isModalOpen: false,
    isProcessing: false,
    error: null,
    paymentAmount: getPaymentAmount(feature),
    featureName: formatFeatureName(feature)
  });

  const openPaymentModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: true,
      error: null
    }));
  }, []);

  const closePaymentModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      isProcessing: false,
      error: null
    }));
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      isProcessing: false,
      error: null
    }));
    onPaymentSuccess?.();
  }, [onPaymentSuccess]);

  const handlePaymentCancel = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
      isProcessing: false
    }));
    onPaymentCancel?.();
  }, [onPaymentCancel]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const actions: X402PaymentActions = {
    openPaymentModal,
    closePaymentModal,
    handlePaymentSuccess,
    handlePaymentCancel,
    clearError
  };

  return [state, actions];
}

// Helper hook for handling 402 responses from API calls
export function useHandleX402Response() {
  return useCallback((response: Response, openPaymentModal: () => void) => {
    if (response.status === 402) {
      // Check for payment URL in headers
      const paymentUrl = response.headers.get('Payment-Required-URL');
      if (paymentUrl) {
        // Direct redirect to payment URL
        window.open(paymentUrl, '_blank');
      } else {
        // Open payment modal
        openPaymentModal();
      }
      return true;
    }
    return false;
  }, []);
}
