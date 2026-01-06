import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    let userId: string | undefined;
    let orgId: string | undefined;

    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-governs-key');
    const sessionCookie = request.cookies.get('session')?.value;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const session = verifySessionToken(token);
      if (session) {
        userId = session.sub;
        orgId = session.orgId;
      }
    } else if (apiKeyHeader) {
      const apiKey = await prisma.aPIKey.findFirst({
        where: { key: apiKeyHeader, isActive: true },
        select: { userId: true, orgId: true },
      });
      if (apiKey) {
        userId = apiKey.userId;
        orgId = apiKey.orgId;
      }
    } else if (sessionCookie) {
      const session = verifySessionToken(sessionCookie);
      if (session) {
        userId = session.sub;
        orgId = session.orgId;
      }
    }

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);

    const items = await prisma.auditLog.findMany({
      where: {
        orgId,
        action: { in: ['retention.archive', 'retention.restore'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching retention history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention history' },
      { status: 500 }
    );
  }
}
