import { NextRequest, NextResponse } from 'next/server';
import { consumeVerificationToken, markEmailVerified } from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { updateEmailVerificationInKeycloak } from '@/lib/keycloak-admin';
import {
  enqueueKeycloakSyncJob,
  recordKeycloakSyncFailure,
  recordKeycloakSyncSuccess,
} from '@/lib/keycloak-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    // Consume verification token
    const tokenData = await consumeVerificationToken(token, 'email-verify');
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: tokenData.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark email as verified
    await markEmailVerified(user.id);

    // Sync email verification to Keycloak (non-blocking)
    updateEmailVerificationInKeycloak(user.email, true)
      .then(async (result) => {
        if (result.success) {
          await recordKeycloakSyncSuccess(user.id);
        } else {
          await recordKeycloakSyncFailure({ userId: user.id, error: result.error });
        }
      })
      .catch(async (error) => {
        console.error('Keycloak email verification sync failed:', error);
        await recordKeycloakSyncFailure({ userId: user.id, error });
      });

    // Get user's organizations to redirect to their dashboard
    const memberships = await prisma.orgMembership.findMany({
      where: { userId: user.id },
      include: { org: true },
      orderBy: { createdAt: 'asc' }, // First org created (their own)
    });

    const activeOrg = memberships[0]?.org;

    // If we have org context, enqueue a best-effort full sync job to update claims.
    // (No password available here; this only updates existing Keycloak users.)
    if (activeOrg) {
      await enqueueKeycloakSyncJob({
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
        orgId: activeOrg.id,
        orgSlug: activeOrg.slug,
        role: (memberships[0]?.role as any) || 'VIEWER',
        emailVerified: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      activeOrgSlug: activeOrg?.slug,
    });

  } catch (error) {
    console.error('Email verification consume error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const token = body?.token as string | undefined;

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    // Consume verification token
    const tokenData = await consumeVerificationToken(token, 'email-verify');
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: tokenData.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark email as verified
    await markEmailVerified(user.id);

    // Sync email verification to Keycloak (non-blocking)
    updateEmailVerificationInKeycloak(user.email, true)
      .then(async (result) => {
        if (result.success) {
          await recordKeycloakSyncSuccess(user.id);
        } else {
          await recordKeycloakSyncFailure({ userId: user.id, error: result.error });
        }
      })
      .catch(async (error) => {
        console.error('Keycloak email verification sync failed:', error);
        await recordKeycloakSyncFailure({ userId: user.id, error });
      });

    // Get user's organizations to redirect to their dashboard
    const memberships = await prisma.orgMembership.findMany({
      where: { userId: user.id },
      include: { org: true },
      orderBy: { createdAt: 'asc' },
    });

    const activeOrg = memberships[0]?.org;

    if (activeOrg) {
      await enqueueKeycloakSyncJob({
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
        orgId: activeOrg.id,
        orgSlug: activeOrg.slug,
        role: (memberships[0]?.role as any) || 'VIEWER',
        emailVerified: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      activeOrgSlug: activeOrg?.slug,
    });

  } catch (error) {
    console.error('Email verification consume error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
