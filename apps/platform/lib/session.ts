import { NextRequest } from 'next/server';
import { verifySessionToken, SessionData } from './auth';
import { prisma } from '@governs-ai/db';

export interface RequestContext {
  userId: string;
  orgId: string;
  orgSlug: string;
  roles: string[];
  session: SessionData;
}

export async function getRequestContext(request: NextRequest): Promise<RequestContext | null> {
  // Get session from cookie
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) return null;

  const session = verifySessionToken(sessionToken);
  if (!session) return null;

  // Get user's first org membership (in a real app, you'd select based on context)
  const membership = await prisma.orgMembership.findFirst({
    where: { userId: session.sub },
    include: { org: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!membership) return null;

  return {
    userId: session.sub,
    orgId: membership.org.id,
    orgSlug: membership.org.slug,
    roles: [membership.role],
    session,
  };
}

export async function requireAuth(request: NextRequest): Promise<RequestContext> {
  const context = await getRequestContext(request);
  if (!context) {
    throw new Error('Authentication required');
  }
  return context;
}

export async function requireRole(request: NextRequest, requiredRole: string): Promise<RequestContext> {
  const context = await requireAuth(request);

  const roleHierarchy = ['VIEWER', 'DEVELOPER', 'ADMIN', 'OWNER'];
  const userRoleIndex = roleHierarchy.indexOf(context.roles[0] || 'VIEWER');
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  if (userRoleIndex < requiredRoleIndex) {
    throw new Error(`Role ${requiredRole} required`);
  }

  return context;
}
