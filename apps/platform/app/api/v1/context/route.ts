import { NextRequest, NextResponse } from 'next/server';
import { unifiedContext } from '@/lib/services/unified-context';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';

export async function POST(req: NextRequest) {
  try {
    // Auth: Bearer JWT or X-Governs-Key
    let userId: string | undefined;
    let orgId: string | undefined;

    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('x-governs-key');

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
    }

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      content,
      contentType,
      agentId,
      agentName,
      conversationId,
      metadata,
      scope,
      visibility,
    } = body;

    if (!content || !contentType || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const contextId = await unifiedContext.storeContext({
      userId,
      orgId,
      content,
      contentType,
      agentId,
      agentName,
      conversationId,
      metadata,
      scope: scope || 'user',
      visibility: visibility || 'private',
    });

    return NextResponse.json({ success: true, contextId });
  } catch (error: any) {
    console.error('Error storing context:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store context' },
      { status: 500 }
    );
  }
}
