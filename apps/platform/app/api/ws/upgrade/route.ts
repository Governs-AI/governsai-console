import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { getClientIP, checkNetworkAccess } from '@/lib/network-access';
import { generateAllowedChannels } from '@/lib/websocket-schemas';
import { createHash } from 'crypto';

// WebSocket upgrade handler for 1-step authentication
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upgrade = request.headers.get('upgrade');
    const connection = request.headers.get('connection');
    const wsKey = request.headers.get('sec-websocket-key');
    const wsVersion = request.headers.get('sec-websocket-version');
    const protocols = request.headers.get('sec-websocket-protocol');

    // Validate WebSocket upgrade headers
    if (upgrade?.toLowerCase() !== 'websocket' || 
        !connection?.toLowerCase().includes('upgrade') ||
        !wsKey || wsVersion !== '13') {
      return NextResponse.json({ error: 'Invalid WebSocket upgrade request' }, { status: 400 });
    }

    // Extract client info
    const clientIP = getClientIP(request);
    const origin = request.headers.get('origin');
    const userAgent = request.headers.get('user-agent');

    // Parse sec-websocket-protocol for API key
    const protocolList = protocols?.split(',').map(p => p.trim()) || [];
    const bearerProtocol = protocolList.find(p => p.startsWith('bearer.'));
    
    if (!bearerProtocol) {
      return NextResponse.json({ 
        error: 'Authentication required. Use subprotocol: bearer.<API_KEY>' 
      }, { status: 401 });
    }

    const apiKey = bearerProtocol.slice('bearer.'.length);
    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid API key in protocol' }, { status: 401 });
    }

    // Look up API key (hash comparison in production)
    const keyRecord = await prisma.aPIKey.findFirst({
      where: { 
        key: apiKey, // In production: keyHash: hashApiKey(apiKey)
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        org: {
          include: {
            networkRules: {
              where: {
                isActive: true,
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } }
                ]
              }
            }
          }
        }
      }
    });

    if (!keyRecord) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
    }

    // Check network access (Origin + IP/CIDR)
    const networkContext = { ip: clientIP, origin: origin || undefined, userAgent: userAgent || undefined };
    const perKeyIPRules = Array.isArray(keyRecord.ipAllow) ? keyRecord.ipAllow as string[] : [];
    
    const accessCheck = checkNetworkAccess(
      networkContext,
      keyRecord.org.networkRules,
      perKeyIPRules
    );

    if (!accessCheck.allowed) {
      console.log(`Network access denied: ${accessCheck.reason} for IP ${clientIP}, Origin ${origin}`);
      return NextResponse.json({ 
        error: 'Network access denied',
        detail: accessCheck.reason 
      }, { status: 403 });
    }

    // Update last used timestamp
    await prisma.aPIKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() }
    });

    // Generate WebSocket accept key
    const acceptKey = generateWebSocketAcceptKey(wsKey);

    // Generate allowed channels based on key scopes
    const allowedChannels = generateAllowedChannels(
      keyRecord.orgId,
      keyRecord.id,
      keyRecord.scopes
    );

    // Create WebSocket session
    const sessionId = `ws_${createHash('sha256').update(`${keyRecord.id}-${Date.now()}`).digest('hex').slice(0, 16)}`;
    
    await prisma.webSocketSession.create({
      data: {
        sessionId,
        userId: keyRecord.userId,
        orgId: keyRecord.orgId,
        gatewayId: 'default', // In production, use actual gateway ID
        channels: [],
        cursor: {},
        isActive: true,
      }
    });

    // Return WebSocket upgrade response with connection context
    const response = new NextResponse(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': acceptKey,
        'Sec-WebSocket-Protocol': 'governs.v1',
        // Pass connection context in headers for the WebSocket handler
        'X-WS-Session-ID': sessionId,
        'X-WS-Key-ID': keyRecord.id,
        'X-WS-ORG-ID': keyRecord.orgId,
        'X-WS-USER-ID': keyRecord.userId,
        'X-WS-Allowed-Channels': JSON.stringify(allowedChannels),
      }
    });

    return response;

  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateWebSocketAcceptKey(wsKey: string): string {
  const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const hash = createHash('sha1');
  hash.update(wsKey + WEBSOCKET_MAGIC_STRING);
  return hash.digest('base64');
}

// Helper function to hash API keys (for production)
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Validate request origin against allowlist
function isOriginAllowed(origin: string | null, allowlist: string[]): boolean {
  if (!origin) return true; // No origin header (agents)
  
  const normalizedOrigin = origin.toLowerCase();
  return allowlist.some(allowed => {
    const normalizedAllowed = allowed.toLowerCase();
    if (normalizedAllowed.includes('*')) {
      const pattern = normalizedAllowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(normalizedOrigin);
    }
    return normalizedOrigin === normalizedAllowed;
  });
}
