import { prisma } from '../index.js';

export interface DecisionFilters {
  orgId?: string;
  direction?: 'precheck' | 'postcheck';
  decision?: 'allow' | 'transform' | 'deny';
  tool?: string;
  startTime?: Date;
  endTime?: Date;
  correlationId?: string;
}

export interface DecisionWithDetails {
  id: string;
  orgId: string;
  direction: string;
  decision: string;
  tool: string | null;
  scope: string | null;
  detectorSummary: any;
  payloadHash: string;
  latencyMs: number | null;
  correlationId: string | null;
  tags: any;
  ts: Date;
}

export async function getDecisions(
  filters: DecisionFilters = {},
  limit: number = 100,
  offset: number = 0
): Promise<DecisionWithDetails[]> {
  const where: any = {};
  
  if (filters.orgId) where.orgId = filters.orgId;
  if (filters.direction) where.direction = filters.direction;
  if (filters.decision) where.decision = filters.decision;
  if (filters.tool) where.tool = filters.tool;
  if (filters.correlationId) where.correlationId = filters.correlationId;
  
  if (filters.startTime || filters.endTime) {
    where.ts = {};
    if (filters.startTime) where.ts.gte = filters.startTime;
    if (filters.endTime) where.ts.lte = filters.endTime;
  }
  
  return await prisma.decision.findMany({
    where,
    orderBy: { ts: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getDecisionById(id: string): Promise<DecisionWithDetails | null> {
  return await prisma.decision.findUnique({
    where: { id },
  });
}

export async function getDecisionStats(orgId: string, timeRange: { start: Date; end: Date }) {
  const [total, byDecision, byDirection, byTool] = await Promise.all([
    // Total decisions
    prisma.decision.count({
      where: {
        orgId,
        ts: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    }),
    
    // By decision type
    prisma.decision.groupBy({
      by: ['decision'],
      where: {
        orgId,
        ts: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: true,
    }),
    
    // By direction
    prisma.decision.groupBy({
      by: ['direction'],
      where: {
        orgId,
        ts: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: true,
    }),
    
    // By tool (top 10)
    prisma.decision.groupBy({
      by: ['tool'],
      where: {
        orgId,
        ts: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
        tool: { not: null },
      },
      _count: true,
      orderBy: { _count: { tool: 'desc' } },
      take: 10,
    }),
  ]);
  
  return {
    total,
    byDecision: byDecision.reduce((acc: Record<string, number>, item: { decision: string; _count: number }) => {
      acc[item.decision] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byDirection: byDirection.reduce((acc: Record<string, number>, item: { direction: string; _count: number }) => {
      acc[item.direction] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byTool: byTool.reduce((acc: Record<string, number>, item: { tool: string | null; _count: number }) => {
      acc[item.tool || 'unknown'] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}

export async function getLastIngestTime(orgId: string): Promise<Date | null> {
  const lastDecision = await prisma.decision.findFirst({
    where: { orgId },
    orderBy: { ts: 'desc' },
    select: { ts: true },
  });
  
  return lastDecision?.ts || null;
}

export async function getDecisionCount(orgId: string, timeRange: { start: Date; end: Date }): Promise<number> {
  return await prisma.decision.count({
    where: {
      orgId,
      ts: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    },
  });
}
