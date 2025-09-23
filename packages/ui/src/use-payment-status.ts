import { useState, useEffect, useCallback } from 'react';

export interface PaymentStatus {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  tier: string;
  interval: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  successUrl?: string;
}

export interface PaymentUpdate {
  type: 'connected' | 'heartbeat' | 'payment_update';
  paymentId: string;
  status?: string;
  message?: string;
  tier?: string;
  interval?: string;
  error?: string;
  subscriptionId?: string;
  timestamp: string;
}

export function usePaymentStatus(paymentId: string) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial payment status
  const fetchPaymentStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/billing/payment-status?paymentId=${paymentId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setError('Failed to fetch payment status');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  // Set up real-time updates via Server-Sent Events
  useEffect(() => {
    if (!paymentId) return;

    const eventSource = new EventSource(`/api/billing/payment-stream?paymentId=${paymentId}`);
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: PaymentUpdate = JSON.parse(event.data);
        
        if (update.type === 'payment_update') {
          setStatus(prev => prev ? {
            ...prev,
            status: update.status as any,
            updatedAt: update.timestamp,
            error: update.error
          } : null);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setIsConnected(false);
      setError('Connection lost');
    };

    // Clean up
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [paymentId]);

  // Fetch initial status
  useEffect(() => {
    fetchPaymentStatus();
  }, [fetchPaymentStatus]);

  return {
    status,
    isConnected,
    error,
    isLoading,
    refetch: fetchPaymentStatus
  };
}

export function usePaymentStream(paymentId: string, onUpdate?: (update: PaymentUpdate) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    const eventSource = new EventSource(`/api/billing/payment-stream?paymentId=${paymentId}`);
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: PaymentUpdate = JSON.parse(event.data);
        onUpdate?.(update);
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setIsConnected(false);
      setError('Connection lost');
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [paymentId, onUpdate]);

  return { isConnected, error };
}
