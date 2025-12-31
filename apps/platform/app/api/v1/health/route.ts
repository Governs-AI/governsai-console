import { NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

const PRECHECK_SERVICE_URL = process.env.PRECHECK_URL || 'http://localhost:1234';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    precheck: {
      status: 'up' | 'down' | 'not_configured';
      url?: string;
      latency?: number;
      error?: string;
    };
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
      database: {
        status: 'down',
      },
      precheck: {
        status: 'not_configured',
      },
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as health`;
    const dbLatency = Date.now() - dbStart;
    
    health.services.database = {
      status: 'up',
      latency: dbLatency,
    };
  } catch (error) {
    health.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  // Check precheck service connectivity (optional - don't fail health check if down)
  try {
    const precheckStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${PRECHECK_SERVICE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const precheckLatency = Date.now() - precheckStart;

    health.services.precheck = {
      status: response.ok ? 'up' : 'down',
      url: PRECHECK_SERVICE_URL,
      latency: precheckLatency,
    };

    if (!response.ok) {
      health.status = 'degraded'; // Precheck down = degraded, not unhealthy
    }
  } catch (error) {
    health.services.precheck = {
      status: 'down',
      url: PRECHECK_SERVICE_URL,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
    health.status = 'degraded'; // Precheck down = degraded, not unhealthy
  }

  // Return appropriate HTTP status code
  const statusCode = 
    health.status === 'healthy' ? 200 :
    health.status === 'degraded' ? 200 : // Still return 200 for degraded
    503; // Service unavailable for unhealthy

  return NextResponse.json(health, { status: statusCode });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
