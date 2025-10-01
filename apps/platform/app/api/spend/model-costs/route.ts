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

    // Get model usage data
    const modelUsage = await prisma.usageRecord.groupBy({
      by: ['model'],
      where: {
        orgId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        cost: true,
        totalTokens: true,
      },
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });

    // Transform data
    const modelCosts = modelUsage
      .filter(usage => usage.model !== null)
      .map(usage => {
        const totalCost = usage._sum.cost || 0;
        const totalTokens = usage._sum.totalTokens || 0;
        const avgCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;
        const lastUsed = usage._max.createdAt || new Date();

        // Determine provider from model name
        const modelName = usage.model!;
        let provider = 'Unknown';
        if (modelName.includes('gpt')) provider = 'OpenAI';
        else if (modelName.includes('claude')) provider = 'Anthropic';
        else if (modelName.includes('gemini')) provider = 'Google';
        else if (modelName.includes('llama')) provider = 'Meta';

        return {
          modelName,
          totalTokens,
          totalCost,
          avgCostPerToken,
          lastUsed: lastUsed.toISOString(),
          provider,
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({ costs: modelCosts });

  } catch (error) {
    console.error('Error fetching model costs:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch model costs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
