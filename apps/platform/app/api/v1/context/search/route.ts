import { NextRequest, NextResponse } from 'next/server';
import { contextSearch } from '@/lib/services/context-search';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';
import { userResolverService } from '@/lib/services/user-resolver';

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

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized - missing org context' }, { status: 401 });
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
      useRefrag = false,
      compressionRatio,
      externalUserId,
      externalSource = 'default',
    } = body;

    // If externalUserId is provided, resolve it to internal userId
    if (externalUserId) {
      const user = await userResolverService.getUserByExternalId(externalUserId, externalSource);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Use /api/v1/context to create memory first.' },
          { status: 404 }
        );
      }
      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - missing user context' }, { status: 401 });
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    // Choose between REFRAG and standard search
    let result;
    if (useRefrag) {
      result = await contextSearch.searchRefragFull({
        userId,
        orgId,
        query,
        agentId,
        conversationId,
        scope: scope || 'user',
        limit,
        threshold,
        compressionRatio,
      });
    } else {
      result = await contextSearch.searchFull({
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
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching context:', error);
    return NextResponse.json(
      { error: 'Failed to search context' },
      { status: 500 }
    );
  }
}
