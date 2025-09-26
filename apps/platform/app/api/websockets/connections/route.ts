import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');
    
    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    // Get organization by slug
    const org = await prisma.org.findUnique({
      where: { slug: orgSlug },
      select: { id: true }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch WebSocket connections for the organization
    const connections = await prisma.webSocketSession.findMany({
      where: {
        orgId: org.id,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          }
        },
        gateway: {
          select: {
            name: true,
            url: true,
          }
        }
      },
      orderBy: { lastSeen: 'desc' },
    });

    // Transform the data to include additional information
    const enrichedConnections = await Promise.all(
      connections.map(async (connection) => {
        // Try to find associated API key information
        let apiKeyName = null;
        
        // Look for recent audit logs to find which API key was used
        const recentAuditLog = await prisma.auditLog.findFirst({
          where: {
            userId: connection.userId,
            orgId: connection.orgId,
            action: 'websocket_url_generated',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            }
          },
          orderBy: { createdAt: 'desc' },
        });

        if (recentAuditLog && recentAuditLog.details && typeof recentAuditLog.details === 'object') {
          const details = recentAuditLog.details as any;
          apiKeyName = details.apiKeyName || null;
        }

        return {
          id: connection.id,
          sessionId: connection.sessionId,
          userId: connection.userId,
          orgId: connection.orgId,
          gatewayId: connection.gatewayId,
          channels: connection.channels,
          isActive: connection.isActive,
          lastSeen: connection.lastSeen.toISOString(),
          createdAt: connection.createdAt.toISOString(),
          apiKeyName,
          userEmail: connection.user?.email || null,
          userName: connection.user?.name || null,
          gatewayName: connection.gateway?.name || null,
          gatewayUrl: connection.gateway?.url || null,
        };
      })
    );

    // Get connection statistics
    const stats = {
      total: connections.length,
      active: connections.filter(c => c.isActive).length,
      inactive: connections.filter(c => !c.isActive).length,
    };

    return NextResponse.json({
      success: true,
      connections: enrichedConnections,
      stats,
    });

  } catch (error) {
    console.error('WebSocket connections fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
