import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth';
import { syncUserToKeycloak } from '@/lib/keycloak-admin';
import {
  enqueueKeycloakSyncJob,
  recordKeycloakSyncFailure,
  recordKeycloakSyncSuccess,
} from '@/lib/keycloak-sync';

const bodySchema = z
  .object({
    password: z.string().min(1).optional(),
  })
  .optional();

function isPasswordRequiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('password not provided for creation');
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const password = body?.password;

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const membership = await prisma.orgMembership.findUnique({
      where: {
        orgId_userId: {
          orgId: session.orgId,
          userId: user.id,
        },
      },
      include: { org: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Organization access required' }, { status: 403 });
    }

    const result = await syncUserToKeycloak({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      password,
      emailVerified: !!user.emailVerified,
      orgId: membership.org.id,
      orgSlug: membership.org.slug,
      role: membership.role,
    });

    if (result.success) {
      await recordKeycloakSyncSuccess(user.id);
      await prisma.keycloakSyncJob.updateMany({
        where: {
          userId: user.id,
          orgId: membership.org.id,
          status: { in: ['PENDING', 'FAILED', 'RUNNING'] },
        },
        data: { status: 'SUCCEEDED', lastError: null },
      });

      return NextResponse.json({ success: true });
    }

    const err = result.error ?? new Error('Keycloak sync failed');

    if (isPasswordRequiredError(err)) {
      await recordKeycloakSyncFailure({ userId: user.id, error: err });
      return NextResponse.json({ success: false, requiresPassword: true }, { status: 409 });
    }

    await recordKeycloakSyncFailure({ userId: user.id, error: err });

    await enqueueKeycloakSyncJob({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      orgId: membership.org.id,
      orgSlug: membership.org.slug,
      role: membership.role,
      emailVerified: !!user.emailVerified,
      password,
      passwordTtlMs: 15 * 60_000,
    });

    return NextResponse.json({ success: false, error: 'SSO sync failed; retry scheduled.' }, { status: 502 });
  } catch (error) {
    console.error('Keycloak retry error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
