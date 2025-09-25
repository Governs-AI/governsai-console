import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

// Public status endpoint for WebSocket system health
export async function GET(request: NextRequest) {
  try {
    // Get basic stats
    const [gatewayCount, sessionCount, channelCount] = await Promise.all([
      prisma.webSocketGateway.count({
        where: { isActive: true },
      }),
      prisma.webSocketSession.count({
        where: { isActive: true },
      }),
      prisma.webSocketChannel.count({
        where: { isActive: true },
      }),
    ]);

    // Get recent activity
    const recentSessions = await prisma.webSocketSession.findMany({
      where: { isActive: true },
      orderBy: { lastSeen: 'desc' },
      take: 5,
      select: {
        sessionId: true,
        lastSeen: true,
        channels: true,
      },
    });

    return NextResponse.json({
      success: true,
      status: 'healthy',
      stats: {
        activeGateways: gatewayCount,
        activeSessions: sessionCount,
        activeChannels: channelCount,
      },
      recentActivity: recentSessions.map(s => ({
        sessionId: s.sessionId,
        lastSeen: s.lastSeen,
        channelCount: Array.isArray(s.channels) ? s.channels.length : 0,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('WebSocket status error:', error);
    return NextResponse.json(
      { 
        success: false,
        status: 'error',
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
