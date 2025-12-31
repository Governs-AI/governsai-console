import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { createSessionToken, verifySessionToken } from '@/lib/auth';

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

    const body = await request.json().catch(() => ({} as { orgId?: string; orgSlug?: string }));
    const { orgId, orgSlug } = body;

    if (!orgId && !orgSlug) {
      return NextResponse.json(
        { error: 'orgId or orgSlug required' },
        { status: 400 }
      );
    }

    const org = await prisma.org.findFirst({
      where: orgId ? { id: orgId } : { slug: orgSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const membership = await prisma.orgMembership.findFirst({
      where: { userId: session.sub, orgId: org.id },
      select: { role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const newSessionToken = createSessionToken(session.sub, org.id, [membership.role]);

    const response = NextResponse.json({
      success: true,
      activeOrg: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: membership.role,
      },
    });

    response.cookies.set('session', newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Active org switch error:', error);
    return NextResponse.json(
      { error: 'Failed to switch organization' },
      { status: 500 }
    );
  }
}
