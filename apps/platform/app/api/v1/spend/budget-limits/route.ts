import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth, requireRole } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    if (!orgSlug) {
      return NextResponse.json({ error: 'Organization slug required' }, { status: 400 });
    }

    // Get user from session and check admin permissions
    const { userId, orgId } = await requireAuth(request);

    // Check if user has admin permissions for budget management
    const userMembership = await prisma.orgMembership.findFirst({
      where: {
        userId,
        orgId,
      },
      select: {
        role: true,
      },
    });

    if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
      return NextResponse.json(
        { error: 'Admin permissions required to manage budgets' },
        { status: 403 }
      );
    }

    // Get all budget limits for the organization
    const budgetLimits = await prisma.budgetLimit.findMany({
      where: {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate current spend for each budget limit
    const limitsWithSpend = await Promise.all(
      budgetLimits.map(async (limit) => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const currentSpend = await prisma.usageRecord.aggregate({
          where: {
            orgId,
            userId: limit.type === 'user' ? limit.userId : undefined,
            timestamp: {
              gte: monthStart,
              lte: now,
            },
          },
          _sum: {
            cost: true,
          },
        });

        return {
          id: limit.id,
          type: limit.type,
          userId: limit.userId,
          userName: limit.user?.name || limit.user?.email,
          monthlyLimit: Number(limit.monthlyLimit),
          currentSpend: Number(currentSpend._sum.cost || 0),
          isActive: limit.isActive,
          createdAt: limit.createdAt.toISOString(),
          updatedAt: limit.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ limits: limitsWithSpend });

  } catch (error) {
    console.error('Error fetching budget limits:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch budget limits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    if (!orgSlug) {
      return NextResponse.json({ error: 'Organization slug required' }, { status: 400 });
    }

    // Get user from session and check admin permissions
    const { userId, orgId } = await requireAuth(request);

    // Check if user has admin permissions for budget management
    const userMembership = await prisma.orgMembership.findFirst({
      where: {
        userId,
        orgId,
      },
      select: {
        role: true,
      },
    });

    if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
      return NextResponse.json(
        { error: 'Admin permissions required to manage budgets' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, userId: targetUserId, monthlyLimit } = body;

    if (!type || !monthlyLimit) {
      return NextResponse.json(
        { error: 'Type and monthly limit are required' },
        { status: 400 }
      );
    }

    if (type === 'user' && !targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required for user budget limits' },
        { status: 400 }
      );
    }

    // Check if budget limit already exists (active or inactive)
    const existingLimit = await prisma.budgetLimit.findFirst({
      where: {
        orgId,
        type,
        userId: type === 'user' ? targetUserId : null,
      },
    });

    let budgetLimit;
    if (existingLimit) {
      // Update existing limit
      budgetLimit = await prisma.budgetLimit.update({
        where: { id: existingLimit.id },
        data: {
          monthlyLimit,
          isActive: true,
        },
      });
    } else {
      // Create new budget limit
      budgetLimit = await prisma.budgetLimit.create({
        data: {
          orgId,
          userId: type === 'user' ? targetUserId : null,
          type,
          monthlyLimit,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      budgetLimit: {
        id: budgetLimit.id,
        type: budgetLimit.type,
        userId: budgetLimit.userId,
        monthlyLimit: budgetLimit.monthlyLimit,
        isActive: budgetLimit.isActive,
        createdAt: budgetLimit.createdAt.toISOString(),
        updatedAt: budgetLimit.updatedAt.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error creating budget limit:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create budget limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
