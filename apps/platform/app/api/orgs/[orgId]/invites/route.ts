import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createEmailVerificationToken, addUserToOrganization } from '@/lib/auth';
import { requireRole } from '@/lib/session';
import { prisma } from '@governs-ai/db';

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']).default('VIEWER'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { userId, orgId: contextOrgId } = requireRole(request, 'ADMIN');
    const { orgId } = params;

    // Verify user has access to this org
    if (orgId !== contextOrgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = createInviteSchema.parse(body);

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: { orgId },
        },
      },
    });

    if (existingUser?.memberships.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Create invitation token
    const inviteToken = await createEmailVerificationToken(
      email,
      'invite',
      orgId,
      role
    );

    // TODO: Send invitation email
    console.log(`Invitation token for ${email} to org ${orgId}: ${inviteToken}`);

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      inviteToken, // In production, don't return this
    });

  } catch (error) {
    console.error('Create invite error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { userId, orgId: contextOrgId } = requireRole(request, 'ADMIN');
    const { orgId } = params;

    // Verify user has access to this org
    if (orgId !== contextOrgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get organization members
    const members = await prisma.orgMembership.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      members: members.map(m => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        emailVerified: m.user.emailVerified,
        role: m.role,
        createdAt: m.createdAt,
      })),
    });

  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
