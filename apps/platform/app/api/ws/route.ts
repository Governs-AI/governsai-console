import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';

// WebSocket Gateway endpoint
export async function GET(request: NextRequest) {
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

    // Get active WebSocket gateway
    let gateway = await prisma.webSocketGateway.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Create default gateway if none exists
    if (!gateway) {
      gateway = await prisma.webSocketGateway.create({
        data: {
          name: 'Default WebSocket Gateway',
          url: 'ws://localhost:3002/api/ws/gateway',
          description: 'Default WebSocket gateway for development',
          isActive: true,
        },
      });
    }

    // Generate session ID for this connection
    const sessionId = `ws_${randomBytes(16).toString('hex')}`;

    // Create or update WebSocket session
    await prisma.webSocketSession.upsert({
      where: { sessionId },
      update: {
        lastSeen: new Date(),
        isActive: true,
      },
      create: {
        sessionId,
        userId: session.sub,
        orgId: session.orgId,
        gatewayId: gateway.id,
        channels: [],
        isActive: true,
      },
    });

    // Return gateway URL with session token
    const wsUrl = `${gateway.url}?session=${sessionId}&token=${sessionToken}`;

    return NextResponse.json({
      success: true,
      gateway: {
        id: gateway.id,
        name: gateway.name,
        url: wsUrl,
        sessionId,
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

// Create WebSocket gateway (admin only)
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

    const body = await request.json();
    const { name, url, description } = body;

    // Create new WebSocket gateway
    const gateway = await prisma.webSocketGateway.create({
      data: {
        name,
        url,
        description,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      gateway: {
        id: gateway.id,
        name: gateway.name,
        url: gateway.url,
        description: gateway.description,
        isActive: gateway.isActive,
        createdAt: gateway.createdAt,
      },
    });

  } catch (error) {
    console.error('WebSocket gateway creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
