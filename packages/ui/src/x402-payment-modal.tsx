"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Loader2, CreditCard, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export interface X402PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  featureName: string;
  amount: number;
  onPaymentSuccess?: () => void;
  onPaymentCancel?: () => void;
}

interface PaymentStatus {
  chargeId: string;
  status: string;
  isPaid: boolean;
  isFailed: boolean;
  hostedUrl: string;
  expiresAt: string;
}

export function X402PaymentModal({
  open,
  onOpenChange,
  feature,
  featureName,
  amount,
  onPaymentSuccess,
  onPaymentCancel
}: X402PaymentModalProps) {
  const [isCreatingCharge, setIsCreatingCharge] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create payment charge when modal opens
  useEffect(() => {
    if (open && !paymentStatus && !isCreatingCharge) {
      createPaymentCharge();
    }
  }, [open]);

  // Poll payment status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (paymentStatus && isPolling && !paymentStatus.isPaid && !paymentStatus.isFailed) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/billing/x402?chargeId=${paymentStatus.chargeId}`);
          if (response.ok) {
            const status = await response.json();
            setPaymentStatus(status);
            
            if (status.isPaid) {
              setIsPolling(false);
              onPaymentSuccess?.();
            } else if (status.isFailed) {
              setIsPolling(false);
            }
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentStatus, isPolling, onPaymentSuccess]);

  const createPaymentCharge = async () => {
    setIsCreatingCharge(true);
    setError(null);
    
    try {
      const response = await fetch('/api/billing/x402', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          feature,
          returnUrl: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment charge');
      }

      const charge = await response.json();
      setPaymentStatus({
        chargeId: charge.chargeId,
        status: 'new',
        isPaid: false,
        isFailed: false,
        hostedUrl: charge.hostedUrl,
        expiresAt: charge.expiresAt
      });
      
      setIsPolling(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create payment');
    } finally {
      setIsCreatingCharge(false);
    }
  };

  const handlePayNow = () => {
    if (paymentStatus?.hostedUrl) {
      window.open(paymentStatus.hostedUrl, '_blank');
    }
  };

  const handleCancel = () => {
    setIsPolling(false);
    onPaymentCancel?.();
    onOpenChange(false);
  };

  const getStatusBadge = () => {
    if (!paymentStatus) return null;
    
    if (paymentStatus.isPaid) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    }
    
    if (paymentStatus.isFailed) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    }
    
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return 'Expired';
    if (diffMins < 60) return `${diffMins}m remaining`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m remaining`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Required
          </DialogTitle>
          <DialogDescription>
            Complete payment to access {featureName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="text-red-800 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {isCreatingCharge && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Creating payment...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {paymentStatus && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">${amount.toFixed(2)} USD</CardTitle>
                  {getStatusBadge()}
                </div>
                <CardDescription>{featureName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentStatus.isPaid ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-800">Payment Confirmed!</p>
                    <p className="text-sm text-muted-foreground">You can now use {featureName}</p>
                  </div>
                ) : paymentStatus.isFailed ? (
                  <div className="text-center py-4">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                    <p className="font-medium text-red-800">Payment Failed</p>
                    <p className="text-sm text-muted-foreground">Please try again or contact support</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Pay with cryptocurrency (Bitcoin, Ethereum, etc.)
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        {formatExpiryTime(paymentStatus.expiresAt)}
                      </p>
                    </div>
                    
                    {isPolling && (
                      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Waiting for payment confirmation...</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-2">
            {paymentStatus && !paymentStatus.isPaid && !paymentStatus.isFailed && (
              <Button onClick={handlePayNow} className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            )}
            
            {paymentStatus?.isPaid ? (
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Continue
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Powered by Coinbase Commerce • Secure cryptocurrency payments
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
