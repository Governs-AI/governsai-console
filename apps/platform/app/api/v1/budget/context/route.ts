import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function GET(req: NextRequest) {
  let orgId: string | undefined;
  let userId: string | undefined;

  try {
    // Get API key from header
    const apiKey = req.headers.get('X-Governs-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Find API key and get user/org
    const keyRecord = await prisma.aPIKey.findUnique({
      where: { key: apiKey },
      include: {
        user: true,
        org: true,
      },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    orgId = keyRecord.org.id;
    userId = keyRecord.user.id;

    // Get budget limits (user first, then org)
    const userBudget = await prisma.budgetLimit.findFirst({
      where: { orgId, userId, isActive: true },
    });
    const orgBudget = await prisma.budgetLimit.findFirst({
      where: { orgId, userId: null, isActive: true },
    });

    const budgetLimit = Number(userBudget?.monthlyLimit || orgBudget?.monthlyLimit || 0);
    const budgetType = userBudget ? 'user' : 'organization';

    // Compute start-of-current-calendar-month in UTC
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Scope spend queries: user-level budget uses userId filter; org-level uses orgId
    const spendWhere = budgetType === 'user'
      ? { userId, orgId, timestamp: { gte: monthStart } }
      : { orgId, timestamp: { gte: monthStart } };

    const [llmAgg, purchaseAgg] = await Promise.all([
      prisma.usageRecord.aggregate({
        where: spendWhere,
        _sum: { cost: true },
      }),
      prisma.purchaseRecord.aggregate({
        where: spendWhere,
        _sum: { amount: true },
      }),
    ]);

    const llm_spend = Number(llmAgg._sum.cost ?? 0);
    const purchase_spend = Number(purchaseAgg._sum.amount ?? 0);
    const current_spend = llm_spend + purchase_spend;
    const remaining_budget = Math.max(0, budgetLimit - current_spend);

    return NextResponse.json({
      monthly_limit: budgetLimit,
      current_spend,
      llm_spend,
      purchase_spend,
      remaining_budget,
      budget_type: budgetType,
    });

  } catch (error: any) {
    console.error('[budget:context] Error fetching budget context', {
      message: error?.message,
      orgId,
      userId,
    });
    return NextResponse.json(
      { error: 'Failed to fetch budget context' },
      { status: 500 }
    );
  }
}
