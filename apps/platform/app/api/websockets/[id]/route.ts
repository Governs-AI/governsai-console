import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const updateWebsocketSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    const websocket = await prisma.websocket.findUnique({
      where: { id },
    });

    if (!websocket) {
      return NextResponse.json(
        { error: 'Websocket not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (websocket.userId && websocket.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (websocket.orgId && websocket.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      websocket: {
        id: websocket.id,
        name: websocket.name,
        url: websocket.url,
        key: websocket.key,
        description: websocket.description,
        level: websocket.orgId ? 'org' : 'user',
        isActive: websocket.isActive,
        createdAt: websocket.createdAt,
        updatedAt: websocket.updatedAt,
      },
    });

  } catch (error) {
    console.error('Websocket fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;
    const body = await request.json();
    const updateData = updateWebsocketSchema.parse(body);

    const websocket = await prisma.websocket.findUnique({
      where: { id },
    });

    if (!websocket) {
      return NextResponse.json(
        { error: 'Websocket not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (websocket.userId && websocket.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (websocket.orgId && websocket.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const updatedWebsocket = await prisma.websocket.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      websocket: {
        id: updatedWebsocket.id,
        name: updatedWebsocket.name,
        url: updatedWebsocket.url,
        key: updatedWebsocket.key,
        description: updatedWebsocket.description,
        level: updatedWebsocket.orgId ? 'org' : 'user',
        isActive: updatedWebsocket.isActive,
        createdAt: updatedWebsocket.createdAt,
        updatedAt: updatedWebsocket.updatedAt,
      },
    });

  } catch (error) {
    console.error('Websocket update error:', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    const websocket = await prisma.websocket.findUnique({
      where: { id },
    });

    if (!websocket) {
      return NextResponse.json(
        { error: 'Websocket not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (websocket.userId && websocket.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (websocket.orgId && websocket.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await prisma.websocket.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Websocket deleted successfully',
    });

  } catch (error) {
    console.error('Websocket delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
