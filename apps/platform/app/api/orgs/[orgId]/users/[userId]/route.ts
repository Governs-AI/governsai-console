import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await params;
    const context = await requireAuth(request);
    const { userId: currentUserId } = context;

    // Check if current user is admin of the organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: currentUserId,
        orgId,
        role: {
          in: ['ADMIN', 'OWNER']
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Update user's role in the organization
    const updatedMembership = await prisma.orgMembership.updateMany({
      where: {
        userId,
        orgId,
      },
      data: {
        role: role.toUpperCase(),
      },
    });

    if (updatedMembership.count === 0) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await params;
    const context = await requireAuth(request);
    const { userId: currentUserId } = context;

    // Check if current user is admin of the organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: currentUserId,
        orgId,
        role: {
          in: ['ADMIN', 'OWNER']
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Prevent user from removing themselves
    if (userId === currentUserId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the organization' },
        { status: 400 }
      );
    }

    // Remove user from the organization
    const deletedMembership = await prisma.orgMembership.deleteMany({
      where: {
        userId,
        orgId,
      },
    });

    if (deletedMembership.count === 0) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User removed successfully',
    });
  } catch (error) {
    console.error('Remove user error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove user' },
      { status: 500 }
    );
  }
}
