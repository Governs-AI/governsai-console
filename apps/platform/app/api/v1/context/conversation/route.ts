import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unifiedContext } from '@/lib/services/unified-context';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    const userId = session.user.governs_user_id;
    const orgId = session.user.org_id;

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    const userId = session.user.governs_user_id;
    const orgId = session.user.org_id;

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
