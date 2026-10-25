import { logAuthToken } from '@/lib/dev-log';

describe('logAuthToken', () => {
  const env = { ...process.env };
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    spy.mockRestore();
    process.env = { ...env };
  });

  it('logs under next dev by default', () => {
    (process.env as any).NODE_ENV = 'development';
    delete process.env.LOG_AUTH_TOKENS;
    logAuthToken('Email verification', 'a@b.co', 'tok');
    expect(spy).toHaveBeenCalledWith('Email verification token for a@b.co: tok');
  });

  it('stays silent in production unless explicitly enabled', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.LOG_AUTH_TOKENS;
    logAuthToken('Password reset', 'a@b.co', 'tok');
    expect(spy).not.toHaveBeenCalled();

    process.env.LOG_AUTH_TOKENS = 'true';
    logAuthToken('Password reset', 'a@b.co', 'tok');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('LOG_AUTH_TOKENS=false wins over development', () => {
    (process.env as any).NODE_ENV = 'development';
    process.env.LOG_AUTH_TOKENS = 'false';
    logAuthToken('Invitation', 'a@b.co', 'tok');
    expect(spy).not.toHaveBeenCalled();
  });
});
