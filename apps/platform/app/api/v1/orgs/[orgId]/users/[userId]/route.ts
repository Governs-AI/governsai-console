import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';
import { updateUserOrgInKeycloak, removeUserFromKeycloak } from '@/lib/keycloak-admin';

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

    // Sync role update to Keycloak (non-blocking)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    const org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    if (user && org) {
      updateUserOrgInKeycloak(
        user.email,
        org.id,
        org.slug,
        role.toUpperCase()
      ).catch((error) => {
        console.error('Keycloak role update sync failed:', error);
      });
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

    // Get user email before deletion for Keycloak sync
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

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

    // Remove user from Keycloak since they no longer belong to any org (non-blocking)
    if (user) {
      removeUserFromKeycloak(user.email).catch((error) => {
        console.error('Keycloak user removal sync failed:', error);
      });
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
