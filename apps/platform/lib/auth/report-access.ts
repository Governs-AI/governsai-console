import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';

export interface ReportAuthContext {
  userId: string;
  orgId: string;
  roles: string[];
}

const ADMIN_ROLES = new Set(['ADMIN', 'OWNER']);

export async function resolveReportAuth(
  request: NextRequest
): Promise<ReportAuthContext | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-governs-key');
  const sessionCookie = request.cookies.get('session')?.value;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const session = verifySessionToken(token);
    if (session) {
      return {
        userId: session.sub,
        orgId: session.orgId,
        roles: Array.isArray(session.roles) ? session.roles : [],
      };
    }
  }

  if (apiKeyHeader) {
    const apiKey = await prisma.aPIKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
      select: { userId: true, orgId: true },
    });

    if (apiKey) {
      return { userId: apiKey.userId, orgId: apiKey.orgId, roles: [] };
    }
  }

  if (sessionCookie) {
    const session = verifySessionToken(sessionCookie);
    if (session) {
      return {
        userId: session.sub,
        orgId: session.orgId,
        roles: Array.isArray(session.roles) ? session.roles : [],
      };
    }
  }

  return null;
}

export async function requireReportAdmin(
  auth: ReportAuthContext
): Promise<{ allowed: boolean }> {
  const membership = await prisma.orgMembership.findFirst({
    where: {
      userId: auth.userId,
      orgId: auth.orgId,
      role: { in: ['ADMIN', 'OWNER'] },
    },
    select: { role: true },
  });

  return { allowed: Boolean(membership) };
}

export function isAdminRole(role: string | null | undefined): boolean {
  return Boolean(role && ADMIN_ROLES.has(role));
}
