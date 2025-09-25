import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const resolveWebsocketSchema = z.object({
  userId: z.string(),
  orgId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookies
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const authUserId = session.sub;
    const authOrgId = session.orgId;
    const body = await request.json();
    const { userId, orgId } = resolveWebsocketSchema.parse(body);

    // Verify the requesting user has access to the target user/org
    if (userId !== authUserId) {
      // Check if user is admin of the org
      if (!orgId || orgId !== authOrgId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      const membership = await prisma.orgMembership.findFirst({
        where: {
          orgId,
          userId: authUserId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    const targetOrgId = orgId || authOrgId;

    // Get websockets with org-overrides-user priority
    const [orgWebsockets, userWebsockets] = await Promise.all([
      targetOrgId ? prisma.websocket.findMany({
        where: { 
          orgId: targetOrgId, 
          isActive: true 
        },
        orderBy: { createdAt: 'desc' },
      }) : [],
      prisma.websocket.findMany({
        where: { 
          userId, 
          isActive: true 
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Org-level websockets take priority over user-level
    const resolvedWebsockets = [
      ...orgWebsockets.map(ws => ({ ...ws, level: 'org' as const, priority: 1 })),
      ...userWebsockets.map(ws => ({ ...ws, level: 'user' as const, priority: 2 })),
    ].sort((a, b) => a.priority - b.priority);

    // Remove duplicates (org websockets override user websockets with same name)
    const uniqueWebsockets = new Map();
    resolvedWebsockets.forEach(ws => {
      if (!uniqueWebsockets.has(ws.name) || ws.priority === 1) {
        uniqueWebsockets.set(ws.name, ws);
      }
    });

    const finalWebsockets = Array.from(uniqueWebsockets.values());

    return NextResponse.json({
      success: true,
      websockets: finalWebsockets.map(ws => ({
        id: ws.id,
        name: ws.name,
        url: ws.url,
        key: ws.key,
        description: ws.description,
        level: ws.level,
        isActive: ws.isActive,
        createdAt: ws.createdAt,
      })),
      resolution: {
        orgWebsockets: orgWebsockets.length,
        userWebsockets: userWebsockets.length,
        resolvedWebsockets: finalWebsockets.length,
        overrides: orgWebsockets.length > 0 ? 
          userWebsockets.filter(uw => 
            orgWebsockets.some(ow => ow.name === uw.name)
          ).length : 0,
      },
    });

  } catch (error) {
    console.error('Websocket resolution error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
