import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

// GET: Get budget settings for organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    // Get user from session for authorization
    const { userId } = await requireAuth(req);

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        budgetEnabled: true,
        budgetOnError: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      budgetEnabled: org.budgetEnabled,
      budgetOnError: org.budgetOnError,
    });
  } catch (error) {
    console.error('Error fetching budget settings:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch budget settings' },
      { status: 500 }
    );
  }
}

// PUT: Update budget settings for organization
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, budgetEnabled, budgetOnError } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId required' },
        { status: 400 }
      );
    }

    // Get user from session for authorization
    const { userId } = await requireAuth(req);

    // Validate budgetOnError value
    if (budgetOnError && !['block', 'pass'].includes(budgetOnError)) {
      return NextResponse.json(
        { error: 'budgetOnError must be "block" or "pass"' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (budgetEnabled !== undefined) updateData.budgetEnabled = Boolean(budgetEnabled);
    if (budgetOnError !== undefined) updateData.budgetOnError = budgetOnError;

    const org = await prisma.org.update({
      where: { id: orgId },
      data: updateData,
      select: {
        budgetEnabled: true,
        budgetOnError: true,
      },
    });

    return NextResponse.json({
      budgetEnabled: org.budgetEnabled,
      budgetOnError: org.budgetOnError,
    });
  } catch (error) {
    console.error('Error updating budget settings:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update budget settings' },
      { status: 500 }
    );
  }
}
