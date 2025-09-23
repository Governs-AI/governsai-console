// Dodo Payments TypeScript types based on actual API documentation
export interface DodoConfig {
  bearerToken: string;
  environment: 'test_mode' | 'live_mode';
}

export interface DodoBillingAddress {
  city: string;
  country: string;
  state: string;
  street: string;
  zipcode: string;
}

export interface DodoCustomer {
  email: string;
  name: string;
}

export interface DodoProductCartItem {
  product_id: string;
  quantity: number;
}

export interface DodoPaymentCreateOptions {
  payment_link: boolean;
  billing: DodoBillingAddress;
  customer: DodoCustomer;
  product_cart: DodoProductCartItem[];
  redirect_url?: string;
  custom_data?: Record<string, any>;
}

export interface DodoPayment {
  id: string;
  payment_link: string;
  status: 'pending' | 'completed' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  customer: DodoCustomer;
  product_cart: DodoProductCartItem[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
  custom_data?: Record<string, any>;
}

export interface DodoProduct {
  id: string;
  name: string;
  description?: string;
  type: 'one_time' | 'subscription';
  price: number;
  currency: string;
  billing_cycle?: {
    interval: 'day' | 'week' | 'month' | 'year';
    frequency: number;
  };
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface DodoSubscription {
  id: string;
  customer_id: string;
  product_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  current_period_start: string;
  current_period_end: string;
  next_billed_at?: string;
  canceled_at?: string;
  paused_at?: string;
  created_at: string;
  updated_at: string;
  custom_data?: Record<string, any>;
}

// Webhook event types based on Dodo's webhook structure
export interface DodoWebhookEvent {
  id: string;
  type: string;
  created_at: string;
  data: any;
}

export interface DodoPaymentCompletedEvent extends DodoWebhookEvent {
  type: 'payment.completed';
  data: DodoPayment;
}

export interface DodoPaymentFailedEvent extends DodoWebhookEvent {
  type: 'payment.failed';
  data: DodoPayment;
}

export interface DodoSubscriptionCreatedEvent extends DodoWebhookEvent {
  type: 'subscription.created';
  data: DodoSubscription;
}

export interface DodoSubscriptionUpdatedEvent extends DodoWebhookEvent {
  type: 'subscription.updated';
  data: DodoSubscription;
}

export interface DodoSubscriptionCanceledEvent extends DodoWebhookEvent {
  type: 'subscription.canceled';
  data: DodoSubscription;
}

export type DodoWebhookEventType = 
  | DodoPaymentCompletedEvent
  | DodoPaymentFailedEvent
  | DodoSubscriptionCreatedEvent
  | DodoSubscriptionUpdatedEvent
  | DodoSubscriptionCanceledEvent;

// Error types
export interface DodoError {
  message: string;
  code?: string;
  details?: any;
}

export class DodoApiError extends Error {
  statusCode?: number;
  details?: any;

  constructor(message: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'DodoApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
