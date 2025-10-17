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
    const { query, limit, threshold, scope } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

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
