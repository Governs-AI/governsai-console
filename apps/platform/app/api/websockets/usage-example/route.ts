import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/session';
import { prisma } from '@governs-ai/db';

const usageExampleSchema = z.object({
  userId: z.string(),
  orgId: z.string().optional(),
  tool: z.string().optional(),
  direction: z.enum(['precheck', 'postcheck']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, orgId: authOrgId } = requireAuth(request);
    const body = await request.json();
    const { userId, orgId, tool, direction } = usageExampleSchema.parse(body);

    const targetOrgId = orgId || authOrgId;

    // Get resolved websockets (org overrides user)
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

    // Resolve websockets with org priority
    const resolvedWebsockets = new Map();
    
    // Add user websockets first
    userWebsockets.forEach(ws => {
      resolvedWebsockets.set(ws.name, { ...ws, level: 'user', priority: 2 });
    });
    
    // Add org websockets (override user websockets)
    orgWebsockets.forEach(ws => {
      resolvedWebsockets.set(ws.name, { ...ws, level: 'org', priority: 1 });
    });

    const finalWebsockets = Array.from(resolvedWebsockets.values())
      .sort((a, b) => a.priority - b.priority);

    // Example usage for precheck/postcheck
    const usageExample = {
      userId,
      orgId: targetOrgId,
      tool: tool || 'web.fetch',
      direction: direction || 'precheck',
      websockets: finalWebsockets.map(ws => ({
        name: ws.name,
        url: ws.url,
        key: ws.key,
        level: ws.level,
      })),
      // Example of how to use websockets in precheck/postcheck
      integration: {
        precheck: finalWebsockets
          .filter(ws => ws.name.includes('precheck') || ws.name.includes('validation'))
          .map(ws => ({
            websocket: ws.url,
            key: ws.key,
            payload: {
              userId,
              orgId: targetOrgId,
              tool: tool || 'web.fetch',
              direction: 'precheck',
              timestamp: new Date().toISOString(),
            },
          })),
        postcheck: finalWebsockets
          .filter(ws => ws.name.includes('postcheck') || ws.name.includes('logging'))
          .map(ws => ({
            websocket: ws.url,
            key: ws.key,
            payload: {
              userId,
              orgId: targetOrgId,
              tool: tool || 'web.fetch',
              direction: 'postcheck',
              timestamp: new Date().toISOString(),
            },
          })),
      },
    };

    return NextResponse.json({
      success: true,
      usage: usageExample,
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
    console.error('Websocket usage example error:', error);
    
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
