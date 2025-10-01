import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    console.log('Users API - orgId from params:', orgId);
    
    const context = await requireAuth(request);
    const { userId, orgId: contextOrgId } = context;
    console.log('Users API - userId:', userId, 'contextOrgId:', contextOrgId);

    // Check if user is admin of the organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId,
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

    // Fetch all users in the organization with their details
    const orgMemberships = await prisma.orgMembership.findMany({
      where: {
        orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    // Get additional details for each user
    const users = await Promise.all(
      orgMemberships.map(async (membership) => {
        // Get MFA status
        const mfaTotp = await prisma.mfaTotp.findUnique({
          where: { userId: membership.user.id },
          select: { enabled: true },
        });

        // Get passkeys count
        const passkeysCount = await prisma.passkey.count({
          where: { userId: membership.user.id },
        });

        // Get total spend (if available)
        // TODO: Implement actual spend calculation from decisions
        const totalSpend = 0;

        // Get last activity (if available)
        // TODO: Implement actual last activity tracking
        const lastActivity = null;

        // Determine status
        const status = membership.status || 'active';

        return {
          id: membership.user.id,
          email: membership.user.email,
          name: membership.user.name,
          role: membership.role,
          status,
          mfaEnabled: mfaTotp?.enabled || false,
          passkeysCount,
          totalSpend,
          lastActivity,
          joinedAt: membership.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const context = await requireAuth(request);
    const { userId } = context;

    // Check if user is admin of the organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId,
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
    const { email, name, role = 'member' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          password: '', // Temporary password - user should be prompted to set one
        },
      });
    }

    // Check if user is already a member of the organization
    const existingMembership = await prisma.orgMembership.findFirst({
      where: {
        userId: user.id,
        orgId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Create organization membership
    const newMembership = await prisma.orgMembership.create({
      data: {
        userId: user.id,
        orgId,
        role: role.toUpperCase(),
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User invited successfully',
      user: {
        id: newMembership.user.id,
        email: newMembership.user.email,
        name: newMembership.user.name,
        role: newMembership.role,
        status: newMembership.status,
      },
    });
  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to invite user' },
      { status: 500 }
    );
  }
}
