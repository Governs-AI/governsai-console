import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';
import type { Prisma } from '@prisma/client';

// PUT: Update budget limit
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { monthlyLimit, alertAt, isActive } = body;

    const { orgId } = await requireAuth(req);

    const existingLimit = await prisma.budgetLimit.findFirst({
      where: { id, orgId },
    });

    if (!existingLimit) {
      return NextResponse.json({ error: 'Budget limit not found' }, { status: 404 });
    }

    const updateData: Prisma.BudgetLimitUpdateInput = {};
    if (monthlyLimit !== undefined) updateData.monthlyLimit = parseFloat(monthlyLimit);
    if (alertAt !== undefined) updateData.alertAt = alertAt ? parseFloat(alertAt) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const limit = await prisma.budgetLimit.update({
      where: { id: existingLimit.id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json({ limit });
  } catch (error) {
    console.error('Error updating budget limit:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update budget limit' },
      { status: 500 }
    );
  }
}

// DELETE: Delete budget limit
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { orgId } = await requireAuth(req);

    const existingLimit = await prisma.budgetLimit.findFirst({
      where: { id, orgId },
    });

    if (!existingLimit) {
      return NextResponse.json({ error: 'Budget limit not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    const limit = await prisma.budgetLimit.update({
      where: { id: existingLimit.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, limit });
  } catch (error) {
    console.error('Error deleting budget limit:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete budget limit' },
      { status: 500 }
    );
  }
}
