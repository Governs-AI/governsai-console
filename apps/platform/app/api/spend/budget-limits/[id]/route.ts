import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get user from session
    const { userId, orgId } = await requireAuth(request);

    // Get budget limit
    const budgetLimit = await prisma.budgetLimit.findFirst({
      where: {
        id,
        orgId,
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

    if (!budgetLimit) {
      return NextResponse.json(
        { error: 'Budget limit not found' },
        { status: 404 }
      );
    }

    // Calculate current spend
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentSpend = await prisma.usageRecord.aggregate({
      where: {
        orgId,
        userId: budgetLimit.type === 'user' ? budgetLimit.userId : undefined,
        timestamp: {
          gte: monthStart,
          lte: now,
        },
      },
      _sum: {
        cost: true,
      },
    });

    return NextResponse.json({
      budgetLimit: {
        id: budgetLimit.id,
        type: budgetLimit.type,
        userId: budgetLimit.userId,
        userName: budgetLimit.user?.name || budgetLimit.user?.email,
        monthlyLimit: Number(budgetLimit.monthlyLimit),
        currentSpend: Number(currentSpend._sum.cost || 0),
        isActive: budgetLimit.isActive,
        createdAt: budgetLimit.createdAt.toISOString(),
        updatedAt: budgetLimit.updatedAt.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error fetching budget limit:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch budget limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get user from session
    const { userId, orgId } = await requireAuth(request);

    const body = await request.json();
    const { monthlyLimit, isActive } = body;

    if (monthlyLimit !== undefined && monthlyLimit < 0) {
      return NextResponse.json(
        { error: 'Monthly limit must be positive' },
        { status: 400 }
      );
    }

    // Update budget limit
    const updatedBudgetLimit = await prisma.budgetLimit.update({
      where: {
        id,
        orgId,
      },
      data: {
        ...(monthlyLimit !== undefined && { monthlyLimit }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json({
      success: true,
      budgetLimit: {
        id: updatedBudgetLimit.id,
        type: updatedBudgetLimit.type,
        userId: updatedBudgetLimit.userId,
        userName: updatedBudgetLimit.user?.name || updatedBudgetLimit.user?.email,
        monthlyLimit: Number(updatedBudgetLimit.monthlyLimit),
        isActive: updatedBudgetLimit.isActive,
        createdAt: updatedBudgetLimit.createdAt.toISOString(),
        updatedAt: updatedBudgetLimit.updatedAt.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error updating budget limit:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update budget limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get user from session
    const { userId, orgId } = await requireAuth(request);

    // Delete budget limit
    await prisma.budgetLimit.delete({
      where: {
        id,
        orgId,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting budget limit:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete budget limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
