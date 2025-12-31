import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addUserToOrganization, verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { syncUserToKeycloak } from '@/lib/keycloak-admin';
import {
  enqueueKeycloakSyncJob,
  recordKeycloakSyncFailure,
  recordKeycloakSyncSuccess,
} from '@/lib/keycloak-sync';

const joinSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = joinSchema.parse(body);

    // Load invitation token without consuming it yet
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.purpose !== 'invite') {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    if (verificationToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    const { email, orgId, role } = verificationToken;

    if (!orgId || !role) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    const sessionToken = request.cookies.get('session')?.value;
    if (sessionToken) {
      const session = verifySessionToken(sessionToken);
      if (session) {
        const sessionUser = await prisma.user.findUnique({
          where: { id: session.sub },
          select: { email: true },
        });
        if (sessionUser && sessionUser.email.toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json(
            { error: 'Invitation email does not match the signed-in user' },
            { status: 403 }
          );
        }
      }
    }

    // Find or create user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // User doesn't exist, redirect to invitation signup
      return NextResponse.json(
        {
          error: 'User not found. Please sign up first.',
          requiresSignup: true,
          email: email,
          redirectUrl: `/auth/signup/invited?token=${token}`,
        },
        { status: 400 }
      );
    }

    // Get organization details
    const org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    // Check if user is already a member
    const existingMembership = await prisma.orgMembership.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        organization: {
          id: org?.id,
          name: org?.name,
          slug: org?.slug,
        },
        membership: {
          id: existingMembership.id,
          role: existingMembership.role,
        },
      });
    }

    // Add user to organization
    const membership = await addUserToOrganization(user.id, orgId, role as any);
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    // Sync user to Keycloak with new org (non-blocking)
    if (org) {
      syncUserToKeycloak({
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
        emailVerified: !!user.emailVerified,
        orgId: org.id,
        orgSlug: org.slug,
        role: membership.role,
      })
        .then(async (result) => {
          if (result.success) {
            await recordKeycloakSyncSuccess(user.id);
          } else {
            await recordKeycloakSyncFailure({ userId: user.id, error: result.error });
            await enqueueKeycloakSyncJob({
              userId: user.id,
              email: user.email,
              name: user.name || undefined,
              orgId: org.id,
              orgSlug: org.slug,
              role: membership.role as any,
              emailVerified: !!user.emailVerified,
            });
          }
        })
        .catch(async (error) => {
          console.error('Keycloak sync failed during org join:', error);
          await recordKeycloakSyncFailure({ userId: user.id, error });
          await enqueueKeycloakSyncJob({
            userId: user.id,
            email: user.email,
            name: user.name || undefined,
            orgId: org.id,
            orgSlug: org.slug,
            role: membership.role as any,
            emailVerified: !!user.emailVerified,
          });
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined organization',
      organization: {
        id: org?.id,
        name: org?.name,
        slug: org?.slug,
      },
      membership: {
        id: membership.id,
        role: membership.role,
      },
    });

  } catch (error) {
    console.error('Join organization error:', error);

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
