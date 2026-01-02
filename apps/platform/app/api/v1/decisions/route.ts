import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Add authentication to prevent unauthorized access
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
    
    // SECURITY: Only use authenticated orgId, never accept as parameter
    const targetOrgId = orgId; // Use authenticated orgId only
    const direction = searchParams.get('direction') as 'precheck' | 'postcheck' | undefined;
    const decision = searchParams.get('decision') as 'allow' | 'transform' | 'deny' | undefined;
    const tool = searchParams.get('tool') || undefined;
    const correlationId = searchParams.get('correlationId') || undefined;
    const policyId = searchParams.get('policyId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Parse time range
    const startTime = searchParams.get('startTime') 
      ? new Date(searchParams.get('startTime')!) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    const endTime = searchParams.get('endTime') 
      ? new Date(searchParams.get('endTime')!) 
      : new Date();
    
    // Check if we want stats
    const includeStats = searchParams.get('includeStats') === 'true';
    
    const filters = {
      orgId: targetOrgId, // Use authenticated orgId
      direction,
      decision,
      tool,
      correlationId,
      policyId,
      startTime,
      endTime,
    };
    
    // Build where clause
    const where: any = {};
    where.orgId = targetOrgId; // Always use authenticated orgId
    if (filters.direction) where.direction = filters.direction;
    if (filters.decision) where.decision = filters.decision;
    if (filters.tool) where.tool = filters.tool;
    if (filters.correlationId) where.correlationId = filters.correlationId;
    if (filters.policyId) where.policyId = filters.policyId;
    
    if (filters.startTime || filters.endTime) {
      where.ts = {};
      if (filters.startTime) where.ts.gte = filters.startTime;
      if (filters.endTime) where.ts.lte = filters.endTime;
    }
    
    // Fetch decisions
    const decisions = await prisma.decision.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: limit,
      skip: offset,
    });
    
    // Fetch stats if requested
    let stats = null;
    if (includeStats) {
      const statsWhere: any = {
        orgId,
        ts: {
          gte: startTime,
          lte: endTime,
        },
      };

      if (filters.direction) statsWhere.direction = filters.direction;
      if (filters.decision) statsWhere.decision = filters.decision;
      if (filters.tool) statsWhere.tool = filters.tool;
      if (filters.correlationId) statsWhere.correlationId = filters.correlationId;
      if (filters.policyId) statsWhere.policyId = filters.policyId;

      const toolStatsWhere = statsWhere.tool
        ? statsWhere
        : { ...statsWhere, tool: { not: null } };

      const [total, byDecision, byDirection, byTool, avgLatency] = await Promise.all([
        // Total decisions
        prisma.decision.count({
          where: statsWhere,
        }),
        
        // By decision type
        prisma.decision.groupBy({
          by: ['decision'],
          where: statsWhere,
          _count: true,
        }),
        
        // By direction
        prisma.decision.groupBy({
          by: ['direction'],
          where: statsWhere,
          _count: true,
        }),
        
        // By tool (top 10)
        prisma.decision.groupBy({
          by: ['tool'],
          where: toolStatsWhere,
          _count: true,
          orderBy: { _count: { tool: 'desc' } },
          take: 10,
        }),

        // Average latency (ms)
        prisma.decision.aggregate({
          where: {
            ...statsWhere,
            latencyMs: { not: null },
          },
          _avg: {
            latencyMs: true,
          },
        }),
      ]);
      
      stats = {
        total,
        byDecision: byDecision.reduce((acc: any, item: any) => {
          acc[item.decision] = item._count;
          return acc;
        }, {}),
        byDirection: byDirection.reduce((acc: any, item: any) => {
          acc[item.direction] = item._count;
          return acc;
        }, {}),
        byTool: byTool.reduce((acc: any, item: any) => {
          acc[item.tool || 'unknown'] = item._count;
          return acc;
        }, {}),
        avgLatency: Math.round(avgLatency._avg.latencyMs || 0),
      };
    }
    
    // Get last ingest time for health monitoring
    const lastDecision = await prisma.decision.findFirst({
      where: { orgId: targetOrgId },
      orderBy: { ts: 'desc' },
      select: { ts: true },
    });
    const lastIngestTime = lastDecision?.ts || null;
    
    return NextResponse.json({
      decisions,
      stats,
      lastIngestTime,
      pagination: {
        limit,
        offset,
        hasMore: decisions.length === limit,
      },
    });
    
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
