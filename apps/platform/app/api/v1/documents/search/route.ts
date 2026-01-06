import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';
import { documentProcessor } from '@/lib/services/document-processor';

export const runtime = 'nodejs';

async function resolveAuth(request: NextRequest) {
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

  return { userId, orgId };
}

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, orgId } = await resolveAuth(request);
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      userId: bodyUserId,
      externalUserId,
      externalSource,
      documentIds,
      contentTypes,
      limit,
      threshold,
    } = body;

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const resolvedUserId = externalUserId ? undefined : (bodyUserId || authUserId);

    const results = await documentProcessor.searchDocuments({
      orgId,
      query,
      userId: resolvedUserId,
      externalUserId,
      externalSource,
      documentIds,
      contentTypes,
      limit,
      threshold,
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to search documents' },
      { status: 500 }
    );
  }
}
