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
      query,
      agentId,
      contentTypes,
      conversationId,
      scope,
      limit,
      threshold,
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    const userId = session.user.governs_user_id;
    const orgId = session.user.org_id;

    const results = await unifiedContext.searchContext({
      userId,
      orgId,
      query,
      agentId,
      contentTypes,
      conversationId,
      scope: scope || 'user',
      limit,
      threshold,
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error searching context:', error);
    return NextResponse.json(
      { error: 'Failed to search context' },
      { status: 500 }
    );
  }
}
