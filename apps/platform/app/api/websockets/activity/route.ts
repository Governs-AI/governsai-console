import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@governs-ai/db';

const activitySchema = z.object({
  sessionId: z.string(),
  activityType: z.enum(['connection', 'disconnection', 'message', 'error']),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, activityType, data, timestamp } = activitySchema.parse(body);

    // Find the WebSocket session
    const session = await prisma.webSocketSession.findUnique({
      where: { sessionId },
      include: {
        user: { select: { email: true } },
        gateway: { select: { name: true } }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        orgId: session.orgId,
        action: `websocket_${activityType}`,
        resource: 'websocket_session',
        details: {
          sessionId,
          activityType,
          gatewayName: session.gateway?.name,
          userEmail: session.user?.email,
          channels: session.channels,
          data: data || {},
          timestamp: timestamp || new Date().toISOString(),
        },
      },
    });

    // Update session last seen time for connections and messages
    if (activityType === 'connection' || activityType === 'message') {
      await prisma.webSocketSession.update({
        where: { sessionId },
        data: { 
          lastSeen: new Date(),
          isActive: true
        },
      });
    }

    // Mark session as inactive for disconnections
    if (activityType === 'disconnection') {
      await prisma.webSocketSession.update({
        where: { sessionId },
        data: { 
          lastSeen: new Date(),
          isActive: false
        },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('WebSocket activity logging error:', error);
    
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
