import { NextRequest, NextResponse } from 'next/server';
import { contextSearch } from '@/lib/services/context-search';
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

    const result = await contextSearch.searchFull({
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching context:', error);
    return NextResponse.json(
      { error: 'Failed to search context' },
      { status: 500 }
    );
  }
}
