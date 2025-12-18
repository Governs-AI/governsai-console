import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';

export async function GET(request: NextRequest) {
  try {
    // Auth: Bearer JWT or X-Governs-Key
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

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const queryOrgId = searchParams.get('orgId');
    const agentId = searchParams.get('agentId');
    const contentType = searchParams.get('contentType');
    const scope = searchParams.get('scope');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use auth orgId or query orgId
    const targetOrgId = queryOrgId || orgId;
    const targetUserId = queryUserId || userId;

    // Build where clause
    const where: any = {
      isArchived: includeArchived ? undefined : false,
    };

    // Scope filtering
    if (scope === 'user') {
      where.userId = targetUserId;
      where.scope = 'user';
    } else if (scope === 'org') {
      where.orgId = targetOrgId;
      where.scope = 'org';
    } else {
      // Both user and org scope
      where.OR = [
        { userId: targetUserId, scope: 'user' },
        { orgId: targetOrgId, scope: 'org' },
      ];
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (contentType) {
      where.contentType = contentType;
    }

    // Fetch memories with pagination
    const [memories, totalCount] = await Promise.all([
      prisma.contextMemory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          content: true,
          summary: true,
          contentType: true,
          agentId: true,
          agentName: true,
          conversationId: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          isArchived: true,
          piiDetected: true,
          piiRedacted: true,
          precheckDecision: true,
          scope: true,
          visibility: true,
        },
      }),
      prisma.contextMemory.count({ where }),
    ]);

    // Calculate pagination info
    const hasMore = offset + limit < totalCount;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return NextResponse.json({
      success: true,
      memories,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore,
        totalPages,
        currentPage,
      },
      filters: {
        userId: targetUserId,
        orgId: targetOrgId,
        agentId,
        contentType,
        scope,
        includeArchived,
      },
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}
