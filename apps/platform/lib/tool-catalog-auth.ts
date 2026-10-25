import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import { hashApiKey } from '@/lib/api-keys';

/**
 * Access to the shared tool catalog (`ToolConfig`).
 *
 * The catalog is global: every org's policies target tools by name, and the
 * risk/scope recorded here is what the dashboard shows everyone. So:
 *
 * - read:  any signed-in user or any active API key
 * - write: a signed-in OWNER or ADMIN of their active org. API keys are
 *          always read-only, so an integration can't relabel a tool.
 */
export type CatalogCaller = {
  userId: string;
  orgId: string;
  via: 'session' | 'apiKey';
};

const ADMIN_ROLES: ('OWNER' | 'ADMIN')[] = ['OWNER', 'ADMIN'];

export async function resolveCatalogCaller(request: NextRequest): Promise<CatalogCaller | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const session = verifySessionToken(authHeader.slice('Bearer '.length).trim());
    return session ? { userId: session.sub, orgId: session.orgId, via: 'session' } : null;
  }

  const apiKeyHeader = request.headers.get('x-governs-key');
  if (apiKeyHeader) {
    const key = await prisma.aPIKey.findFirst({
      where: { keyHash: hashApiKey(apiKeyHeader), isActive: true },
      select: { userId: true, orgId: true, expiresAt: true },
    });
    if (!key || (key.expiresAt && key.expiresAt < new Date())) return null;
    return { userId: key.userId, orgId: key.orgId, via: 'apiKey' };
  }

  const sessionCookie = (await cookies()).get('session')?.value;
  const session = sessionCookie ? verifySessionToken(sessionCookie) : null;
  return session ? { userId: session.sub, orgId: session.orgId, via: 'session' } : null;
}

/** Any authenticated caller, or a 401 response. */
export async function requireCatalogReader(request: NextRequest): Promise<CatalogCaller | NextResponse> {
  const caller = await resolveCatalogCaller(request);
  return caller ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** An org OWNER/ADMIN signed in to the dashboard, or a 401/403 response. */
export async function requireCatalogAdmin(request: NextRequest): Promise<CatalogCaller | NextResponse> {
  const caller = await resolveCatalogCaller(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.via === 'apiKey') {
    return NextResponse.json(
      { error: 'The tool catalog is read-only for API keys. An org admin can add or edit tools in the dashboard.' },
      { status: 403 },
    );
  }
  // Role comes from the database, not the token, so a demoted admin loses access at once.
  const membership = await prisma.orgMembership.findFirst({
    where: { userId: caller.userId, orgId: caller.orgId, role: { in: ADMIN_ROLES } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'Only org owners and admins can change the tool catalog.' }, { status: 403 });
  }
  return caller;
}
