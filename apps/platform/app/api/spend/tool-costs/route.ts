import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');
    const timeRange = searchParams.get('timeRange') || '30d';

    if (!orgSlug) {
      return NextResponse.json({ error: 'Organization slug required' }, { status: 400 });
    }

    // Get user from session
    const { userId, orgId } = await requireAuth(request);

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get tool usage data
    const toolUsage = await prisma.usageRecord.groupBy({
      by: ['toolName'],
      where: {
        orgId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        cost: true,
      },
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });

    // Get tool metadata for categories
    const toolMetadata = await prisma.tool.findMany({
      where: {
        orgId,
      },
      select: {
        name: true,
        category: true,
      },
    });

    const toolCategoryMap = toolMetadata.reduce((acc, tool) => {
      acc[tool.name] = tool.category || 'General';
      return acc;
    }, {} as Record<string, string>);

    // Transform data
    const toolCosts = toolUsage
      .filter(usage => usage.toolName !== null)
      .map(usage => {
        const totalCost = usage._sum.cost || 0;
        const totalCalls = usage._count.id;
        const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;
        const lastUsed = usage._max.createdAt || new Date();

        return {
          toolName: usage.toolName!,
          totalCalls,
          totalCost,
          avgCostPerCall,
          lastUsed: lastUsed.toISOString(),
          category: toolCategoryMap[usage.toolName!] || 'General',
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({ costs: toolCosts });

  } catch (error) {
    console.error('Error fetching tool costs:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch tool costs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
