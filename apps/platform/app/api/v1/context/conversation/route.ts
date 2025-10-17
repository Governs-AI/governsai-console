import { NextRequest, NextResponse } from 'next/server';
import { unifiedContext } from '@/lib/services/unified-context';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const agentId = searchParams.get('agentId');
    const limit = searchParams.get('limit');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: conversationId' },
        { status: 400 }
      );
    }

    const contexts = await unifiedContext.getConversationContext(
      conversationId,
      userId,
      orgId,
      {
        agentId: agentId || undefined,
        limit: limit ? parseInt(limit) : 50,
      }
    );

    return NextResponse.json({ success: true, contexts });
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation context' },
      { status: 500 }
    );
  }
}

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
    const { agentId, agentName, title } = body;

    if (!agentId || !agentName) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, agentName' },
        { status: 400 }
      );
    }

    const conversation = await unifiedContext.getOrCreateConversation(
      userId,
      orgId,
      agentId,
      agentName,
      title
    );

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
