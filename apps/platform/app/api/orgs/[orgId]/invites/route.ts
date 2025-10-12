import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createEmailVerificationToken } from '@/lib/auth';
import { requireRole } from '@/lib/session';
import { prisma } from '@governs-ai/db';

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.union([
    z.enum(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']),
    z.array(z.enum(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'])).transform(arr => arr[0]),
    z.string().transform(str => {
      const upperStr = str.toUpperCase();
      if (['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'].includes(upperStr)) {
        return upperStr as 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
      }
      return 'VIEWER';
    })
  ]).default('VIEWER'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId, orgId: contextOrgId } = await requireRole(request, 'ADMIN');
    const { orgId } = await params;

    console.log("1")
    // Verify user has access to this org
    if (orgId !== contextOrgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    console.log("2")

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('Role type:', typeof body.role, 'Role value:', body.role);
    const { email, role } = createInviteSchema.parse(body);
    console.log('Parsed role:', role);

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: { orgId },
        },
      },
    });

    console.log("3")
    if (existingUser?.memberships && existingUser.memberships.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }
    console.log("4")

    // Create invitation token
    const inviteToken = await createEmailVerificationToken(
      email,
      'invite',
      orgId,
      role
    );

    console.log("5")
    // Send invitation email
    const { sendInvitationEmail } = await import('@/lib/email');
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup/invited?token=${inviteToken}`;

    console.log("6")
    // Get inviter name
    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    console.log("7")
    // Get organization name
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    console.log("8")
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: inviter?.name || inviter?.email || 'Someone',
      orgName: org?.name || 'Organization',
      role: role,
      inviteUrl,
    });

    console.log("9")
    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the request, but log the error
    }

    console.log("10")
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
        { error: 'Invalid input', details: error.issues },
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
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId: contextOrgId } = await requireRole(request, 'ADMIN');
    const { orgId } = await params;

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
