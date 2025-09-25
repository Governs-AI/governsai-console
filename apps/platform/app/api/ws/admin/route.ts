import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

// Admin endpoint for managing WebSocket gateways
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

    // Get all gateways
    const gateways = await prisma.webSocketGateway.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Get session stats
    const sessionStats = await prisma.webSocketSession.groupBy({
      by: ['isActive'],
      _count: {
        id: true,
      },
    });

    const activeSessions = sessionStats.find(s => s.isActive)?._count.id || 0;
    const totalSessions = sessionStats.reduce((sum, s) => sum + s._count.id, 0);

    return NextResponse.json({
      success: true,
      gateways: gateways.map(g => ({
        id: g.id,
        name: g.name,
        url: g.url,
        description: g.description,
        isActive: g.isActive,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      stats: {
        totalGateways: gateways.length,
        activeGateways: gateways.filter(g => g.isActive).length,
        activeSessions,
        totalSessions,
      },
    });

  } catch (error) {
    console.error('WebSocket admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new gateway
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

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Create new gateway
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
