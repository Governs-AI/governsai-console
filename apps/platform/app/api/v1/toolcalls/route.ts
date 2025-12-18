import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Auth: Bearer JWT or X-Governs-Key
    let userId: string | undefined;
    let orgId: string | undefined;

    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-governs-key');
    const sessionCookie = request.cookies.get('session')?.value;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const session = verifySessionToken(token);
      if (session) {
        userId = session.sub;
        orgId = session.orgId;
      }
    } else if (apiKeyHeader) {
      const apiKey = await prisma.aPIKey.findFirst({
        where: { key: apiKeyHeader, isActive: true },
        select: { userId: true, orgId: true },
      });
      if (apiKey) {
        userId = apiKey.userId;
        orgId = apiKey.orgId;
      }
    } else if (sessionCookie) {
      const session = verifySessionToken(sessionCookie);
      if (session) {
        userId = session.sub;
        orgId = session.orgId;
      }
    }

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const tool = searchParams.get('tool') || undefined;
    const decision = searchParams.get('decision') as 'allow' | 'transform' | 'deny' | undefined;
    const timeRange = searchParams.get('timeRange') || '24h';
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const endTime = searchParams.get('endTime')
      ? new Date(searchParams.get('endTime')!)
      : new Date();

    let startTime: Date;
    if (searchParams.get('startTime')) {
      startTime = new Date(searchParams.get('startTime')!);
    } else {
      switch (timeRange) {
        case '1h':
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      }
    }

    // SECURITY: Only use authenticated orgId, never accept as parameter
    const targetOrgId = orgId;

    const where: any = {
      orgId: targetOrgId,
      ts: {
        gte: startTime,
        lte: endTime,
      },
      tool: { not: null },
    };

    if (tool) {
      where.tool = tool;
    }

    if (decision) {
      where.decision = decision;
    }

    const toolcalls = await prisma.decision.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: limit,
      skip: offset,
    });

    let stats = null;
    if (includeStats) {
      const [total, byTool, byDecision, avgLatency, lastToolcallTime] = await Promise.all([
        prisma.decision.count({ where }),

        prisma.decision.groupBy({
          by: ['tool'],
          where,
          _count: true,
          orderBy: { _count: { tool: 'desc' } },
          take: 10,
        }),

        prisma.decision.groupBy({
          by: ['decision'],
          where,
          _count: true,
        }),

        prisma.decision.aggregate({
          where: {
            ...where,
            latencyMs: { not: null },
          },
          _avg: {
            latencyMs: true,
          },
        }),

        prisma.decision.findFirst({
          where,
          orderBy: { ts: 'desc' },
          select: { ts: true },
        }),
      ]);

      stats = {
        total,
        byTool: byTool.reduce((acc: Record<string, number>, item: any) => {
          acc[item.tool || 'unknown'] = item._count;
          return acc;
        }, {}),
        byDecision: byDecision.reduce((acc: Record<string, number>, item: any) => {
          acc[item.decision] = item._count;
          return acc;
        }, {}),
        avgLatency: Math.round(avgLatency._avg.latencyMs || 0),
        lastToolcallTime: lastToolcallTime?.ts || null,
      };
    }

    return NextResponse.json({
      toolcalls,
      stats,
      lastIngestTime: stats?.lastToolcallTime || null,
      pagination: {
        limit,
        offset,
        hasMore: toolcalls.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching toolcalls:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
