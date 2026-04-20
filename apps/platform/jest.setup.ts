// Set required environment variables before any module imports.
// The webhook route throws at module load time if WEBHOOK_SECRET is absent.
process.env.WEBHOOK_SECRET = 'test-webhook-secret-for-ci';
process.env.JWT_SECRET = 'test-jwt-secret-for-ci';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_ci';
process.env.STRIPE_SECRET_KEY = 'sk_test_billing_ci';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_billing_ci';
// NODE_ENV is read-only in TypeScript strict mode; it is already 'test' when jest runs
