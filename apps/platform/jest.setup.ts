// Set required environment variables before any module imports.
// The webhook route throws at module load time if WEBHOOK_SECRET is absent.
process.env.WEBHOOK_SECRET = 'test-webhook-secret-for-ci';
process.env.JWT_SECRET = 'test-jwt-secret-for-ci';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_ci';
process.env.NODE_ENV = 'test';
