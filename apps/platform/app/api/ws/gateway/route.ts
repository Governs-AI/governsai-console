import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

// This is a placeholder for the actual WebSocket gateway
// In production, this would be a separate service or edge function
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session');
    const token = searchParams.get('token');

    if (!sessionId || !token) {
      return NextResponse.json({ error: 'Missing session or token' }, { status: 400 });
    }

    // Verify session token
    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get session from database
    const wsSession = await prisma.webSocketSession.findUnique({
      where: { sessionId },
      include: { gateway: true },
    });

    if (!wsSession || !wsSession.isActive) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Update last seen
    await prisma.webSocketSession.update({
      where: { sessionId },
      data: { lastSeen: new Date() },
    });

    // Return session info for WebSocket connection
    return NextResponse.json({
      success: true,
      session: {
        id: wsSession.id,
        sessionId: wsSession.sessionId,
        userId: wsSession.userId,
        orgId: wsSession.orgId,
        channels: wsSession.channels,
        cursor: wsSession.cursor,
        gateway: wsSession.gateway,
      },
    });

  } catch (error) {
    console.error('WebSocket gateway error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle WebSocket subscription updates
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session');
    const token = searchParams.get('token');

    if (!sessionId || !token) {
      return NextResponse.json({ error: 'Missing session or token' }, { status: 400 });
    }

    // Verify session token
    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { channels, cursor } = body;

    // Update session with new channels and cursor
    await prisma.webSocketSession.update({
      where: { sessionId },
      data: {
        channels: channels || [],
        cursor: cursor || null,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Session updated',
    });

  } catch (error) {
    console.error('WebSocket session update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
