import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const newKeySchema = z.object({
  channels: z.array(z.string()).min(1),
  description: z.string().optional(),
  keyName: z.string().optional(),
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
    const { channels, description, keyName } = newKeySchema.parse(body);

    // Validate channels format and permissions
    const validChannels = [];
    for (const channel of channels) {
      const [type, id, name] = channel.split(':');
      
      if (type === 'org' && id === orgId) {
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

    // Generate a unique API key
    const keyValue = `gai_${Math.random().toString(36).substr(2, 32)}`;
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const defaultKeyName = keyName || `WebSocket Key ${timestamp}`;

    // Create new API key
    const newApiKey = await prisma.aPIKey.create({
      data: {
        key: keyValue,
        name: defaultKeyName,
        userId,
        orgId,
        scopes: ['precheck:invoke', 'ingest:write', 'policy:publish'],
        env: 'prod',
        isActive: true,
      },
      include: {
        org: true,
        user: true,
      },
    });

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

    // Generate WebSocket URL with the new API key
    const baseWsUrl = gateway.url.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${baseWsUrl}?key=${newApiKey.key}&org=${newApiKey.org.slug}&channels=${validChannels.join(',')}`;

    // Log the new API key creation for audit
    await prisma.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'api_key_created',
        resource: 'api_key',
        details: {
          apiKeyId: newApiKey.id,
          apiKeyName: newApiKey.name,
          purpose: 'websocket_integration',
          channels: validChannels,
          description,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Also log the WebSocket URL generation
    await prisma.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'websocket_url_generated',
        resource: 'websocket_url',
        details: {
          apiKeyId: newApiKey.id,
          apiKeyName: newApiKey.name,
          channels: validChannels,
          description,
          gatewayId: gateway.id,
          newKey: true,
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
        id: newApiKey.id,
        name: newApiKey.name,
        scopes: newApiKey.scopes,
        createdAt: newApiKey.createdAt,
        lastUsed: newApiKey.lastUsed,
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
    console.error('New API key creation error:', error);
    
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
