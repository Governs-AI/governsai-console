import { NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

const PRECHECK_SERVICE_URL = process.env.PRECHECK_URL || 'http://localhost:8082';
const WEBSOCKET_SERVICE_URL = process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:3001';

type ServiceState = 'up' | 'down' | 'not_configured';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: { status: ServiceState; latency?: number };
    precheck: { status: ServiceState; latency?: number };
    websocket: { status: ServiceState; latency?: number };
  };
  version: string;
  environment: string;
}

async function probe(url: string, signal: AbortSignal): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  const res = await fetch(url, { signal, cache: 'no-store' });
  return { ok: res.ok, latency: Date.now() - start };
}

export async function GET() {
  const health: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { status: 'down' },
      precheck: { status: 'not_configured' },
      websocket: { status: 'not_configured' },
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // DB — failure means unhealthy (DB is a hard dep).
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as health`;
    health.services.database = { status: 'up', latency: Date.now() - dbStart };
  } catch (error) {
    console.error('Database health check failed:', error instanceof Error ? error.message : 'Unknown');
    health.services.database = { status: 'down' };
    health.status = 'unhealthy';
  }

  // precheck — failure is degraded (we can still serve dashboard pages).
  if (PRECHECK_SERVICE_URL) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    try {
      const { ok, latency } = await probe(`${PRECHECK_SERVICE_URL}/api/v1/health`, ctl.signal);
      health.services.precheck = { status: ok ? 'up' : 'down', latency };
      if (!ok && health.status === 'healthy') health.status = 'degraded';
    } catch {
      health.services.precheck = { status: 'down' };
      if (health.status === 'healthy') health.status = 'degraded';
    } finally {
      clearTimeout(timer);
    }
  }

  // websocket service — failure is degraded; only blocks real-time audit.
  if (WEBSOCKET_SERVICE_URL) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    try {
      const { ok, latency } = await probe(`${WEBSOCKET_SERVICE_URL}/health`, ctl.signal);
      health.services.websocket = { status: ok ? 'up' : 'down', latency };
      if (!ok && health.status === 'healthy') health.status = 'degraded';
    } catch {
      health.services.websocket = { status: 'down' };
      if (health.status === 'healthy') health.status = 'degraded';
    } finally {
      clearTimeout(timer);
    }
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  return NextResponse.json(health, { status: statusCode });
}

// Health endpoint is intentionally public — no auth, no CORS restriction needed
export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
