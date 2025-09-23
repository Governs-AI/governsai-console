"use client";

import React from 'react';
import { usePaymentStatus } from './use-payment-status';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface PaymentStatusProps {
  paymentId: string;
  onSuccess?: (status: any) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function PaymentStatus({ paymentId, onSuccess, onError, onComplete }: PaymentStatusProps) {
  const { status, isConnected, error, isLoading } = usePaymentStatus(paymentId);

  React.useEffect(() => {
    if (status?.status === 'completed') {
      onSuccess?.(status);
      onComplete?.();
    } else if (status?.status === 'failed') {
      onError?.(status.error || 'Payment failed');
    }
  }, [status, onSuccess, onError, onComplete]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading payment status...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            Connection Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center p-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p>Payment not found</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusMessage = () => {
    switch (status.status) {
      case 'completed':
        return 'Payment completed successfully!';
      case 'failed':
        return status.error || 'Payment failed. Please try again.';
      case 'cancelled':
        return 'Payment was cancelled.';
      case 'processing':
        return 'Processing your payment...';
      default:
        return 'Waiting for payment...';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Status</span>
          <Badge className={getStatusColor()}>
            {status.status.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isConnected ? (
            <span className="text-green-600">● Connected</span>
          ) : (
            <span className="text-red-600">● Disconnected</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <span className="font-medium">{getStatusMessage()}</span>
        </div>
        
        {status.tier && (
          <div className="text-sm text-gray-600">
            <strong>Plan:</strong> {status.tier} ({status.interval})
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Payment ID: {status.paymentId}
        </div>
        
        {status.status === 'completed' && status.successUrl && (
          <Button 
            onClick={() => window.location.href = status.successUrl!}
            className="w-full"
          >
            Continue to Dashboard
          </Button>
        )}
        
        {status.status === 'failed' && (
          <Button 
            onClick={() => window.location.href = '/pricing'}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentStatusInline({ paymentId }: { paymentId: string }) {
  const { status, isConnected } = usePaymentStatus(paymentId);

  if (!status) return null;

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span className="capitalize">{status.status}</span>
      {status.status === 'processing' && (
        <Loader2 className="w-3 h-3 animate-spin" />
      )}
    </div>
  );
}
