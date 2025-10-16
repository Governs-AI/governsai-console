import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function GET(req: NextRequest) {
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

    const orgId = keyRecord.org.id;
    const userId = keyRecord.user.id;

    // Get budget limits (user first, then org)
    const userBudget = await prisma.budgetLimit.findFirst({
      where: { orgId, userId, isActive: true },
    });
    const orgBudget = await prisma.budgetLimit.findFirst({
      where: { orgId, userId: null, isActive: true },
    });

    const budgetLimit = Number(userBudget?.monthlyLimit || orgBudget?.monthlyLimit || 0);
    const budgetType = userBudget ? 'user' : 'organization';

    // For now, return simplified budget context without complex aggregations
    // TODO: Add real spend calculations once database queries are working
    const result = {
      monthly_limit: budgetLimit,
      current_spend: 0, // Simplified for now
      llm_spend: 0,
      purchase_spend: 0,
      remaining_budget: budgetLimit,
      budget_type: budgetType,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching budget context:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      orgId,
      userId
    });
    return NextResponse.json(
      { error: 'Failed to fetch budget context', details: error.message },
      { status: 500 }
    );
  }
}
