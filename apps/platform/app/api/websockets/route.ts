import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';

const createWebsocketSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  level: z.enum(['org', 'user']),
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
    const { name, url, description, level } = createWebsocketSchema.parse(body);

    // Generate unique websocket key
    const key = `ws_${randomBytes(16).toString('hex')}`;

    // Create websocket based on level
    const websocketData = {
      name,
      url,
      key,
      description,
      isActive: true,
    };

    let websocket;
    if (level === 'org') {
      // Org-level websocket
      websocket = await prisma.websocket.create({
        data: {
          ...websocketData,
          orgId,
          userId: null,
        },
      });
    } else {
      // User-level websocket
      websocket = await prisma.websocket.create({
        data: {
          ...websocketData,
          orgId: null,
          userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      websocket: {
        id: websocket.id,
        name: websocket.name,
        url: websocket.url,
        key: websocket.key,
        description: websocket.description,
        level,
        isActive: websocket.isActive,
        createdAt: websocket.createdAt,
      },
    });

  } catch (error) {
    console.error('Websocket creation error:', error);
    
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

    const userId = session.sub;
    const orgId = session.orgId;

    // Get both org-level and user-level websockets
    const [orgWebsockets, userWebsockets] = await Promise.all([
      prisma.websocket.findMany({
        where: { orgId, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.websocket.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const websockets = [
      ...orgWebsockets.map(ws => ({ ...ws, level: 'org' as const })),
      ...userWebsockets.map(ws => ({ ...ws, level: 'user' as const })),
    ];

    return NextResponse.json({
      success: true,
      websockets: websockets.map(ws => ({
        id: ws.id,
        name: ws.name,
        url: ws.url,
        key: ws.key,
        description: ws.description,
        level: ws.level,
        isActive: ws.isActive,
        createdAt: ws.createdAt,
      })),
    });

  } catch (error) {
    console.error('Websocket fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
