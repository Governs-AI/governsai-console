import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import { buildArchive } from '@/lib/services/log-archive';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const startTime = body?.startTime ? new Date(body.startTime) : undefined;
    const endTime = body?.endTime ? new Date(body.endTime) : undefined;

    if (startTime && Number.isNaN(startTime.getTime())) {
      return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 });
    }
    if (endTime && Number.isNaN(endTime.getTime())) {
      return NextResponse.json({ error: 'Invalid endTime' }, { status: 400 });
    }

    const mode = body?.mode === 'move' ? 'move' : 'copy';
    const include = body?.include || undefined;

    const archive = await buildArchive({
      orgId,
      startTime,
      endTime,
      mode,
      include,
    });

    const safeTimestamp = archive.exportedAt.replace(/[:.]/g, '-');
    const filename = `governsai-archive-${orgId}-${safeTimestamp}.json`;

    return new NextResponse(JSON.stringify(archive), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error creating archive:', error);
    return NextResponse.json(
      { error: 'Failed to create archive' },
      { status: 500 }
    );
  }
}
