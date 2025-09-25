import { NextRequest } from 'next/server';
import { verifySessionToken, SessionData } from './auth';

export interface RequestContext {
  userId: string;
  orgId: string;
  orgSlug: string;
  roles: string[];
  session: SessionData;
}

export function getRequestContext(request: NextRequest): RequestContext | null {
  // Get session from cookie
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) return null;

  const session = verifySessionToken(sessionToken);
  if (!session) return null;

  // Get org context from headers (set by middleware)
  const orgId = request.headers.get('x-org-id');
  const orgSlug = request.headers.get('x-org-slug');
  const rolesHeader = request.headers.get('x-user-roles');

  if (!orgId || !orgSlug || !rolesHeader) return null;

  let roles: string[];
  try {
    roles = JSON.parse(rolesHeader);
  } catch {
    return null;
  }

  return {
    userId: session.sub,
    orgId,
    orgSlug,
    roles,
    session,
  };
}

export function requireAuth(request: NextRequest): RequestContext {
  const context = getRequestContext(request);
  if (!context) {
    throw new Error('Authentication required');
  }
  return context;
}

export function requireRole(request: NextRequest, requiredRole: string): RequestContext {
  const context = requireAuth(request);
  
  const roleHierarchy = ['VIEWER', 'DEVELOPER', 'ADMIN', 'OWNER'];
  const userRoleIndex = roleHierarchy.indexOf(context.roles[0] || 'VIEWER');
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  if (userRoleIndex < requiredRoleIndex) {
    throw new Error(`Role ${requiredRole} required`);
  }
  
  return context;
}
