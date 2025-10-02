import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

// GET: List budget limits
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    // Get user from session for authorization
    const { userId } = await requireAuth(req);

    const limits = await prisma.budgetLimit.findMany({
      where: { orgId, isActive: true },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ limits });
  } catch (error) {
    console.error('Error fetching budget limits:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch budget limits' },
      { status: 500 }
    );
  }
}

// POST: Create budget limit
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, userId, type, monthlyLimit, alertAt } = body;

    if (!orgId || !type || !monthlyLimit) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, type, monthlyLimit' },
        { status: 400 }
      );
    }

    // Get user from session for authorization
    const { userId: sessionUserId } = await requireAuth(req);

    // Validate type
    if (!['organization', 'user'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "organization" or "user"' },
        { status: 400 }
      );
    }

    // For user-level limits, userId is required
    if (type === 'user' && !userId) {
      return NextResponse.json(
        { error: 'userId required for user-level budget limits' },
        { status: 400 }
      );
    }

    // Check if limit already exists for this org-user combination
    const existingLimit = await prisma.budgetLimit.findFirst({
      where: {
        orgId,
        userId: type === 'user' ? userId : null,
        isActive: true,
      },
    });

    if (existingLimit) {
      return NextResponse.json(
        { error: 'Budget limit already exists for this organization and user' },
        { status: 409 }
      );
    }

    const limit = await prisma.budgetLimit.create({
      data: {
        orgId,
        userId: type === 'user' ? userId : null,
        type,
        monthlyLimit: parseFloat(monthlyLimit),
        alertAt: alertAt ? parseFloat(alertAt) : null,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json({ limit });
  } catch (error) {
    console.error('Error creating budget limit:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create budget limit' },
      { status: 500 }
    );
  }
}
