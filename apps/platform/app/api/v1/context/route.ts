import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unifiedContext } from '@/lib/services/unified-context';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    const userId = session.user.governs_user_id;
    const orgId = session.user.org_id;

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
