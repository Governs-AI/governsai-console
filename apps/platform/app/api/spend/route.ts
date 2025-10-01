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

    // Get organization budget limit
    const budgetLimit = await prisma.budgetLimit.findFirst({
      where: {
        orgId,
        type: 'organization',
        isActive: true,
      },
      select: {
        monthlyLimit: true,
      },
    });

    // Get usage records for the time period
    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        orgId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate spend data
    const totalSpend = usageRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
    
    // Calculate monthly spend (last 30 days)
    const monthlyStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthlySpend = usageRecords
      .filter(record => record.createdAt >= monthlyStartDate)
      .reduce((sum, record) => sum + (record.cost || 0), 0);

    // Calculate daily spend (today)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailySpend = usageRecords
      .filter(record => record.createdAt >= todayStart)
      .reduce((sum, record) => sum + (record.cost || 0), 0);

    // Calculate tool spend
    const toolSpend: Record<string, number> = {};
    usageRecords.forEach(record => {
      if (record.toolName) {
        toolSpend[record.toolName] = (toolSpend[record.toolName] || 0) + (record.cost || 0);
      }
    });

    // Calculate model spend
    const modelSpend: Record<string, number> = {};
    usageRecords.forEach(record => {
      if (record.model) {
        modelSpend[record.model] = (modelSpend[record.model] || 0) + (record.cost || 0);
      }
    });

    // Calculate user spend
    const userSpend: Record<string, number> = {};
    usageRecords.forEach(record => {
      if (record.userId) {
        userSpend[record.userId] = (userSpend[record.userId] || 0) + (record.cost || 0);
      }
    });

    const monthlyLimit = budgetLimit?.monthlyLimit || 0;
    const remainingBudget = monthlyLimit - monthlySpend;
    const isOverBudget = monthlySpend > monthlyLimit;

    const spendData = {
      totalSpend,
      monthlySpend,
      dailySpend,
      toolSpend,
      modelSpend,
      userSpend,
      budgetLimit: monthlyLimit,
      remainingBudget,
      isOverBudget,
    };

    return NextResponse.json({ spend: spendData });

  } catch (error) {
    console.error('Error fetching spend data:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch spend data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
