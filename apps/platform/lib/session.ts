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

export interface OrgRequestContext extends RequestContext {
  billingTier: string;
  billingStatus: string;
}

export class BillingRestrictionError extends Error {
  status = 402;

  constructor(message = 'Organization access is restricted until billing is restored') {
    super(message);
    this.name = 'BillingRestrictionError';
  }
}

function getSessionData(request: NextRequest): SessionData | null {
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) return null;

  return verifySessionToken(sessionToken);
}

async function resolveMembership(session: SessionData, options: { orgId?: string; orgSlug?: string } = {}) {
  let targetOrgId = options.orgId ?? session.orgId;

  if (options.orgSlug) {
    const org = await prisma.org.findUnique({
      where: { slug: options.orgSlug },
      select: { id: true },
    });

    if (!org) {
      return null;
    }

    targetOrgId = org.id;
  }

  if (targetOrgId) {
    return prisma.orgMembership.findFirst({
      where: { userId: session.sub, orgId: targetOrgId },
      include: { org: true },
    });
  }

  return prisma.orgMembership.findFirst({
    where: { userId: session.sub },
    include: { org: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getRequestContext(request: NextRequest): Promise<RequestContext | null> {
  const session = getSessionData(request);
  if (!session) return null;

  const membership = await resolveMembership(session);
  if (!membership) return null;

  return {
    userId: session.sub,
    orgId: membership.org.id,
    orgSlug: membership.org.slug,
    roles: [membership.role],
    session,
  };
}

export async function getOrgRequestContext(
  request: NextRequest,
  options: { orgId?: string; orgSlug?: string } = {}
): Promise<OrgRequestContext | null> {
  const session = getSessionData(request);
  if (!session) return null;

  const membership = await resolveMembership(session, options);
  if (!membership) return null;

  return {
    userId: session.sub,
    orgId: membership.org.id,
    orgSlug: membership.org.slug,
    roles: [membership.role],
    billingTier: membership.org.billingTier,
    billingStatus: membership.org.billingStatus,
    session,
  };
}

export function isOrgBillingRestricted(org: {
  billingTier?: string | null;
  billingStatus?: string | null;
}): boolean {
  return org.billingTier === 'restricted' || org.billingStatus === 'canceled';
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

export async function requireOrgBillingAccess(
  request: NextRequest,
  options: { orgId?: string; orgSlug?: string } = {}
): Promise<OrgRequestContext> {
  const context = await getOrgRequestContext(request, options);

  if (!context) {
    throw new Error('Authentication required');
  }

  if (isOrgBillingRestricted(context)) {
    throw new BillingRestrictionError();
  }

  return context;
}
