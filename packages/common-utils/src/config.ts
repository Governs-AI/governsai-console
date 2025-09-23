// Billing Configuration
export const BILLING_CONFIG = {
  // Paddle Configuration (Primary payment provider)
  PADDLE: {
    ENVIRONMENT: process.env.PADDLE_ENVIRONMENT || 'sandbox',
    CLIENT_TOKEN: process.env.PADDLE_CLIENT_TOKEN || '',
    API_KEY: process.env.PADDLE_API_KEY || '',
    WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET || '',
    VENDOR_ID: process.env.PADDLE_VENDOR_ID || '',
    
    // Price IDs
    PRICES: {
      BASIC_MONTHLY: process.env.PADDLE_PRICE_BASIC_MONTHLY || '',
      PRO_MONTHLY: process.env.PADDLE_PRICE_PRO_MONTHLY || '',
      PRO_YEARLY: process.env.PADDLE_PRICE_PRO_YEARLY || '',
    },
    
    // Public token for frontend
    PUBLIC_TOKEN: process.env.NEXT_PUBLIC_PADDLE_TOKEN || '',
  },
  
  // Feature Limits
  FEATURES: {
    FREE: {
      interviews_per_week: 2,
      video_minutes_per_week: 10,
      resume_exports_per_month: 2,
      auto_apply_per_month: 3,
      job_matches_per_day: 50,
      stored_resumes: 1,
      saved_jobs: 20,
    },
    BASIC: {
      interviews_per_week: 10,
      video_minutes_per_week: 60,
      resume_exports_per_month: 10,
      auto_apply_per_month: 25,
      job_matches_per_day: 200,
      stored_resumes: 3,
      saved_jobs: 100,
    },
    PRO: {
      interviews_per_week: Infinity,
      video_minutes_per_week: 240,
      resume_exports_per_month: 20,
      auto_apply_per_month: 100,
      job_matches_per_day: 1000,
      stored_resumes: 10,
      saved_jobs: 200,
    },
  },
  
  // URLs
  URLS: {
    PRICING: '/pricing',
    BILLING_PORTAL: '/billing',
    SUCCESS: '/billing/success',
    CANCEL: '/billing/cancel',
  },
} as const;
