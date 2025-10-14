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
    const { query, limit, threshold, scope } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    const userId = session.user.governs_user_id;
    const orgId = session.user.org_id;

    const results = await unifiedContext.searchCrossAgent(
      userId,
      orgId,
      query,
      {
        limit,
        threshold,
        scope: scope || 'user',
      }
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error searching cross-agent context:', error);
    return NextResponse.json(
      { error: 'Failed to search cross-agent context' },
      { status: 500 }
    );
  }
}
