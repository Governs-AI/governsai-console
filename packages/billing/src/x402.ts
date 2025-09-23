import { PayPerUseFeature, PAY_PER_USE_PRICING } from './entitlements';

// Coinbase Commerce API configuration
const COINBASE_API_BASE = 'https://api.commerce.coinbase.com';

export interface CreateChargeOptions {
  userId: string;
  feature: PayPerUseFeature;
  description: string;
  metadata?: Record<string, string>;
}

export interface CoinbaseCharge {
  id: string;
  code: string;
  name: string;
  description: string;
  pricing: {
    local: { amount: string; currency: string };
    bitcoin: { amount: string; currency: string };
    ethereum: { amount: string; currency: string };
  };
  payments: any[];
  timeline: Array<{
    time: string;
    status: string;
  }>;
  metadata: Record<string, string>;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  confirmed_at?: string;
  checkout?: {
    id: string;
  };
  resource: string;
  resource_path: string;
}

export interface X402PaymentRequest {
  feature: PayPerUseFeature;
  amount: number;
  currency: 'USD';
  chargeId?: string;
  hostedUrl?: string;
}

// Create a Coinbase Commerce charge for pay-per-use features
export async function createCoinbaseCharge(options: CreateChargeOptions): Promise<CoinbaseCharge> {
  const { userId, feature, description, metadata = {} } = options;
  const amount = PAY_PER_USE_PRICING[feature];

  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    throw new Error('COINBASE_COMMERCE_API_KEY environment variable is required');
  }

  const chargeData = {
    name: `${feature.replace('_', ' ').toUpperCase()}`,
    description,
    local_price: {
      amount: amount.toFixed(2),
      currency: 'USD'
    },
    pricing_type: 'fixed_price',
    metadata: {
      userId,
      feature,
      source: 'x402_payment',
      ...metadata
    }
  };

  const response = await fetch(`${COINBASE_API_BASE}/charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22'
    },
    body: JSON.stringify(chargeData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Coinbase Commerce API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return result.data;
}

// Get charge details from Coinbase Commerce
export async function getCoinbaseCharge(chargeId: string): Promise<CoinbaseCharge> {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    throw new Error('COINBASE_COMMERCE_API_KEY environment variable is required');
  }

  const response = await fetch(`${COINBASE_API_BASE}/charges/${chargeId}`, {
    method: 'GET',
    headers: {
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Coinbase Commerce API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return result.data;
}

// Generate HTTP 402 Payment Required response
export function createX402Response(paymentRequest: X402PaymentRequest): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'WWW-Authenticate': `x402-payment-required feature=${paymentRequest.feature} amount=${paymentRequest.amount} currency=${paymentRequest.currency}`,
  });

  // Add payment URL if available
  if (paymentRequest.hostedUrl) {
    headers.set('Payment-Required-URL', paymentRequest.hostedUrl);
  }

  const body = {
    error: 'Payment Required',
    code: 402,
    message: `Payment of $${paymentRequest.amount} required for ${paymentRequest.feature}`,
    payment: {
      feature: paymentRequest.feature,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      ...(paymentRequest.chargeId && { chargeId: paymentRequest.chargeId }),
      ...(paymentRequest.hostedUrl && { paymentUrl: paymentRequest.hostedUrl })
    }
  };

  return new Response(JSON.stringify(body), {
    status: 402,
    headers
  });
}

// Verify Coinbase Commerce webhook signature
export function verifyCoinbaseWebhook(payload: string, signature: string): boolean {
  const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('COINBASE_COMMERCE_WEBHOOK_SECRET environment variable is required');
  }

  // Coinbase Commerce uses HMAC SHA256
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Helper to get payment amount for a feature
export function getPaymentAmount(feature: PayPerUseFeature): number {
  return PAY_PER_USE_PRICING[feature];
}

// Helper to format feature name for display
export function formatFeatureName(feature: PayPerUseFeature): string {
  const names: Record<PayPerUseFeature, string> = {
    resume_export: 'Resume Export',
    interview_text: 'Text Interview',
    interview_chat: 'Chat Interview',
    interview_video: 'Video Interview'
  };
  return names[feature];
}
