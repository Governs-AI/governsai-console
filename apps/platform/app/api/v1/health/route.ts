import { NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

const PRECHECK_SERVICE_URL = process.env.PRECHECK_URL || 'http://localhost:1234';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: { status: 'up' | 'down'; latency?: number };
    precheck: { status: 'up' | 'down' | 'not_configured'; latency?: number };
  };
  version: string;
  environment: string;
}

export async function GET() {
  const health: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { status: 'down' },
      precheck: { status: 'not_configured' },
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as health`;
    health.services.database = { status: 'up', latency: Date.now() - dbStart };
  } catch (error) {
    console.error('Database health check failed:', error instanceof Error ? error.message : 'Unknown');
    health.services.database = { status: 'down' };
    health.status = 'unhealthy';
  }

  try {
    const precheckStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${PRECHECK_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    health.services.precheck = {
      status: response.ok ? 'up' : 'down',
      latency: Date.now() - precheckStart,
    };
    if (!response.ok) health.status = 'degraded';
  } catch {
    health.services.precheck = { status: 'down' };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  return NextResponse.json(health, { status: statusCode });
}

// Health endpoint is intentionally public — no auth, no CORS restriction needed
export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
