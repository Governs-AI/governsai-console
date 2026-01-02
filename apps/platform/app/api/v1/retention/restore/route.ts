import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import { restoreArchive } from '@/lib/services/log-archive';

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

    const formData = await request.formData();
    const file = formData.get('file') || formData.get('archive');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing archive file' }, { status: 400 });
    }

    const text = await (file as File).text();
    let payload: any;

    try {
      payload = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid archive JSON' }, { status: 400 });
    }

    const result = await restoreArchive(payload, orgId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error restoring archive:', error);
    return NextResponse.json(
      { error: 'Failed to restore archive' },
      { status: 500 }
    );
  }
}
