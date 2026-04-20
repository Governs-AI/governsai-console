import { NextRequest } from 'next/server';
import middleware from '@/middleware';

describe('platform middleware', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('redirects restricted org routes to org-scoped pricing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ restricted: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const response = await middleware(
      new NextRequest('http://localhost/o/acme/dashboard', {
        headers: {
          cookie: 'session=test-session',
        },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/o/acme/pricing?billing=restricted');
  });

  it('blocks restricted state-changing API routes with 402', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ restricted: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const response = await middleware(
      new NextRequest('http://localhost/api/v1/policies', {
        method: 'POST',
        headers: {
          cookie: 'session=test-session',
        },
      })
    );

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({
      error: 'Organization access is restricted until billing is restored',
    });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('allows billing checkout requests to proceed for recovery', async () => {
    const response = await middleware(
      new NextRequest('http://localhost/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          cookie: 'session=test-session',
        },
      })
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
