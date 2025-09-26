import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const generateUrlSchema = z.object({
  apiKeyId: z.string(),
  channels: z.array(z.string()).min(1),
  description: z.string().optional(),
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

    const userId = session.sub;
    const orgId = session.orgId;
    const body = await request.json();
    const { apiKeyId, channels, description } = generateUrlSchema.parse(body);

    // Verify API key belongs to user and is active
    const apiKey = await prisma.aPIKey.findFirst({
      where: { 
        id: apiKeyId,
        userId,
        orgId,
        isActive: true 
      },
      include: { 
        org: true,
        user: true
      }
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found or access denied' },
        { status: 404 }
      );
    }

    // Validate channels format and permissions
    const validChannels = [];
    for (const channel of channels) {
      const [type, id, name] = channel.split(':');
      
      if (type === 'org' && id === orgId) {
        validChannels.push(channel);
      } else if (type === 'key' && id === apiKeyId) {
        validChannels.push(channel);
      } else if (type === 'user' && id === userId) {
        validChannels.push(channel);
      } else {
        return NextResponse.json(
          { error: `Invalid channel: ${channel}` },
          { status: 400 }
        );
      }
    }

    // Get or create WebSocket gateway
    let gateway = await prisma.webSocketGateway.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!gateway) {
      // Create default gateway
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://ws.governs.ai'
        : 'ws://localhost:3002';
        
      gateway = await prisma.webSocketGateway.create({
        data: {
          name: 'Default WebSocket Gateway',
          url: `${baseUrl}/api/ws/gateway`,
          description: 'Default WebSocket gateway for precheck/postcheck integration',
          isActive: true,
        },
      });
    }

    // Generate WebSocket URL with embedded API key and channels
    const baseWsUrl = gateway.url.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${baseWsUrl}?key=${apiKey.key}&org=${apiKey.org.slug}&channels=${validChannels.join(',')}`;

    // Log the URL generation for audit
    await prisma.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'websocket_url_generated',
        resource: 'websocket_url',
        details: {
          apiKeyId,
          apiKeyName: apiKey.name,
          channels: validChannels,
          description,
          gatewayId: gateway.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      wsUrl,
      gateway: {
        id: gateway.id,
        name: gateway.name,
        description: gateway.description,
      },
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        scopes: apiKey.scopes,
      },
      channels: validChannels,
      usage: {
        connect: `const ws = new WebSocket('${wsUrl}');`,
        send: `ws.send(JSON.stringify({
  type: 'INGEST',
  channel: '${validChannels[0]}',
  schema: 'decision.v1',
  idempotencyKey: 'unique-key-' + Date.now(),
  data: {
    orgId: '${orgId}',
    direction: 'precheck',
    decision: 'allow',
    tool: 'web.fetch',
    scope: 'https://api.example.com',
    detectorSummary: {},
    payloadHash: 'sha256:abc123',
    latencyMs: 45,
    correlationId: 'req-123',
    tags: ['production'],
    ts: new Date().toISOString()
  }
}));`,
      },
    });

  } catch (error) {
    console.error('WebSocket URL generation error:', error);
    
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

// Get available channels for WebSocket configuration
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

    const userId = session.sub;
    const orgId = session.orgId;

    // Get user's API keys
    let apiKeys = await prisma.aPIKey.findMany({
      where: {
        userId,
        orgId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        createdAt: true,
        lastUsed: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Don't auto-create API keys - let user create them explicitly

    // Define available channels
    const availableChannels = [
      {
        id: `org:${orgId}:decisions`,
        name: 'All Decisions',
        description: 'All precheck and postcheck decisions',
        type: 'org',
        recommended: true,
      },
      {
        id: `org:${orgId}:precheck`,
        name: 'Precheck Only',
        description: 'Precheck decisions only',
        type: 'org',
        recommended: false,
      },
      {
        id: `org:${orgId}:postcheck`,
        name: 'Postcheck Only',
        description: 'Postcheck decisions only',
        type: 'org',
        recommended: false,
      },
      {
        id: `org:${orgId}:approvals`,
        name: 'Approvals',
        description: 'Approval requests and responses',
        type: 'org',
        recommended: false,
      },
      {
        id: `org:${orgId}:dlq`,
        name: 'Dead Letter Queue',
        description: 'Failed events and errors',
        type: 'org',
        recommended: false,
      },
      {
        id: `user:${userId}:notifications`,
        name: 'User Notifications',
        description: 'Personal notifications',
        type: 'user',
        recommended: false,
      },
    ];

    return NextResponse.json({
      success: true,
      apiKeys,
      channels: availableChannels,
      examples: {
        precheck: {
          direction: 'precheck',
          decision: 'allow',
          tool: 'web.fetch',
          scope: 'https://api.example.com',
        },
        postcheck: {
          direction: 'postcheck',
          decision: 'transform',
          tool: 'ai.generate',
          scope: 'text-generation',
        },
      },
    });

  } catch (error) {
    console.error('WebSocket config fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
