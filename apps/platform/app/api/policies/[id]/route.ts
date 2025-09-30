import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/policies/[id] - Get specific policy
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const policy = await prisma.policy.findUnique({
      where: { id: params.id },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error('Error fetching policy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policy' },
      { status: 500 }
    );
  }
}

// PUT /api/policies/[id] - Update policy
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      version,
      defaults,
      toolAccess,
      denyTools,
      allowTools,
      networkScopes,
      networkTools,
      onError,
      priority,
      isActive,
    } = body;

    const policy = await prisma.policy.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(version && { version }),
        ...(defaults && { defaults }),
        ...(toolAccess !== undefined && { toolAccess }),
        ...(denyTools !== undefined && { denyTools }),
        ...(allowTools !== undefined && { allowTools }),
        ...(networkScopes !== undefined && { networkScopes }),
        ...(networkTools !== undefined && { networkTools }),
        ...(onError && { onError }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ policy });
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}

// DELETE /api/policies/[id] - Delete policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.policy.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json(
      { error: 'Failed to delete policy' },
      { status: 500 }
    );
  }
}
