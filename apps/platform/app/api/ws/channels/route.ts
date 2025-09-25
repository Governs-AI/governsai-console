import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const createChannelSchema = z.object({
  channelType: z.enum(['org', 'user', 'key']),
  channelName: z.string().min(1),
  keyId: z.string().optional(),
  description: z.string().optional(),
});

const subscribeSchema = z.object({
  channels: z.array(z.string()).min(1),
});

// Get available channels for user/org
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

    // Get all available channels for this user/org
    const [orgChannels, userChannels, keyChannels] = await Promise.all([
      // Org-level channels
      prisma.webSocketChannel.findMany({
        where: { 
          orgId, 
          isActive: true,
          channelType: 'org'
        },
        orderBy: { channelName: 'asc' },
      }),
      // User-level channels
      prisma.webSocketChannel.findMany({
        where: { 
          userId, 
          isActive: true,
          channelType: 'user'
        },
        orderBy: { channelName: 'asc' },
      }),
      // Key-level channels
      prisma.webSocketChannel.findMany({
        where: { 
          userId,
          isActive: true,
          channelType: 'key'
        },
        include: { key: true },
        orderBy: { channelName: 'asc' },
      }),
    ]);

    // Format channels with proper channel identifiers
    const channels = [
      ...orgChannels.map(ch => ({
        id: ch.id,
        channel: `org:${orgId}:${ch.channelName}`,
        type: 'org' as const,
        name: ch.channelName,
        description: ch.description,
        createdAt: ch.createdAt,
      })),
      ...userChannels.map(ch => ({
        id: ch.id,
        channel: `user:${userId}:${ch.channelName}`,
        type: 'user' as const,
        name: ch.channelName,
        description: ch.description,
        createdAt: ch.createdAt,
      })),
      ...keyChannels.map(ch => ({
        id: ch.id,
        channel: `key:${ch.keyId}:${ch.channelName}`,
        type: 'key' as const,
        name: ch.channelName,
        description: ch.description,
        keyName: ch.key?.name,
        createdAt: ch.createdAt,
      })),
    ];

    return NextResponse.json({
      success: true,
      channels,
      summary: {
        orgChannels: orgChannels.length,
        userChannels: userChannels.length,
        keyChannels: keyChannels.length,
        total: channels.length,
      },
    });

  } catch (error) {
    console.error('Channels fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new channel
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
    const { channelType, channelName, keyId, description } = createChannelSchema.parse(body);

    // Validate keyId if provided
    if (channelType === 'key' && keyId) {
      const key = await prisma.aPIKey.findFirst({
        where: { 
          id: keyId, 
          userId,
          isActive: true 
        },
      });
      if (!key) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 400 }
        );
      }
    }

    // Create channel based on type
    let channelData: any = {
      channelType,
      channelName,
      description,
      isActive: true,
    };

    if (channelType === 'org') {
      channelData.orgId = orgId;
      channelData.userId = null;
      channelData.keyId = null;
    } else if (channelType === 'user') {
      channelData.userId = userId;
      channelData.orgId = null;
      channelData.keyId = null;
    } else if (channelType === 'key') {
      channelData.keyId = keyId;
      channelData.userId = userId;
      channelData.orgId = null;
    }

    const channel = await prisma.webSocketChannel.create({
      data: channelData,
    });

    // Generate channel identifier
    let channelIdentifier: string;
    if (channelType === 'org') {
      channelIdentifier = `org:${orgId}:${channelName}`;
    } else if (channelType === 'user') {
      channelIdentifier = `user:${userId}:${channelName}`;
    } else {
      channelIdentifier = `key:${keyId}:${channelName}`;
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        channel: channelIdentifier,
        type: channelType,
        name: channelName,
        description: channel.description,
        createdAt: channel.createdAt,
      },
    });

  } catch (error) {
    console.error('Channel creation error:', error);
    
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

// Subscribe to channels
export async function PUT(request: NextRequest) {
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
    const { channels } = subscribeSchema.parse(body);

    // Validate channels and check permissions
    const validatedChannels = [];
    for (const channel of channels) {
      const [type, id, name] = channel.split(':');
      
      if (type === 'org' && id === session.orgId) {
        validatedChannels.push(channel);
      } else if (type === 'user' && id === session.sub) {
        validatedChannels.push(channel);
      } else if (type === 'key') {
        // Check if user has access to this key
        const key = await prisma.aPIKey.findFirst({
          where: { 
            id, 
            userId: session.sub,
            isActive: true 
          },
        });
        if (key) {
          validatedChannels.push(channel);
        }
      }
    }

    // Update session with subscribed channels
    await prisma.webSocketSession.updateMany({
      where: { 
        userId: session.sub,
        isActive: true 
      },
      data: {
        channels: validatedChannels,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      subscribed: validatedChannels,
      rejected: channels.filter(c => !validatedChannels.includes(c)),
    });

  } catch (error) {
    console.error('Channel subscription error:', error);
    
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
