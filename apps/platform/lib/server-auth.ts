import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SessionData } from './auth';
import { prisma } from '@governs-ai/db';

export async function getServerSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    return null;
  }

  return verifySessionToken(sessionToken);
}

export async function requireServerAuth(): Promise<SessionData> {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/auth/login');
  }

  return session;
}

export async function getUserOrganizations(userId: string) {
  return prisma.orgMembership.findMany({
    where: { userId },
    include: { org: true },
  });
}

export async function getOrganizationBySlug(slug: string, userId: string) {
  return prisma.orgMembership.findFirst({
    where: {
      userId,
      org: { slug },
    },
    include: { org: true },
  });
}
