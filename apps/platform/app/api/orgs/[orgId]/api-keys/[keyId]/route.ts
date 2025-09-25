import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';

const updateKeySchema = z.object({
  name: z.string().min(1).optional(),
  scopes: z.array(z.enum(['decisions', 'approvals', 'dlq', 'toolcalls', 'usage'])).optional(),
  env: z.enum(['development', 'staging', 'production']).optional(),
  ipAllow: z.array(z.string()).optional().nullable(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Get specific API key
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string; keyId: string } }
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

    const { orgId, keyId } = params;

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN', 'DEVELOPER'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the API key
    const apiKey = await prisma.aPIKey.findFirst({
      where: { id: keyId, orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Get usage statistics
    const [sessionCount, usageCount, recentUsage] = await Promise.all([
      prisma.webSocketSession.count({
        where: {
          userId: apiKey.userId,
          orgId,
          isActive: true,
        },
      }),
      prisma.usageRecord.count({
        where: { apiKeyId: keyId },
      }),
      prisma.usageRecord.findMany({
        where: { apiKeyId: keyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          model: true,
          totalTokens: true,
          cost: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      key: {
        id: apiKey.id,
        name: apiKey.name,
        keyPreview: `${apiKey.key.slice(0, 12)}...${apiKey.key.slice(-4)}`,
        scopes: apiKey.scopes,
        env: apiKey.env,
        isActive: apiKey.isActive,
        lastUsed: apiKey.lastUsed,
        ipAllow: apiKey.ipAllow,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
        expiresAt: apiKey.expiresAt,
        createdBy: apiKey.user,
        stats: {
          activeSessions: sessionCount,
          totalUsage: usageCount,
          recentUsage,
        },
      },
    });

  } catch (error) {
    console.error('API key fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update API key
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string; keyId: string } }
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

    const { orgId, keyId } = params;
    const body = await request.json();
    const updateData = updateKeySchema.parse(body);

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if key exists
    const existingKey = await prisma.aPIKey.findFirst({
      where: { id: keyId, orgId },
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Update the key
    const updatedKey = await prisma.aPIKey.update({
      where: { id: keyId },
      data: {
        ...updateData,
        ipAllow: updateData.ipAllow === null ? null : updateData.ipAllow,
        expiresAt: updateData.expiresAt === null ? null : 
                   updateData.expiresAt ? new Date(updateData.expiresAt) : existingKey.expiresAt,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      key: {
        id: updatedKey.id,
        name: updatedKey.name,
        keyPreview: `${updatedKey.key.slice(0, 12)}...${updatedKey.key.slice(-4)}`,
        scopes: updatedKey.scopes,
        env: updatedKey.env,
        isActive: updatedKey.isActive,
        lastUsed: updatedKey.lastUsed,
        ipAllow: updatedKey.ipAllow,
        createdAt: updatedKey.createdAt,
        updatedAt: updatedKey.updatedAt,
        expiresAt: updatedKey.expiresAt,
        createdBy: updatedKey.user,
      },
    });

  } catch (error) {
    console.error('API key update error:', error);
    
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

// Delete/Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string; keyId: string } }
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

    const { orgId, keyId } = params;
    const { searchParams } = new URL(request.url);
    const disconnect = searchParams.get('disconnect') === 'true';

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if key exists
    const existingKey = await prisma.aPIKey.findFirst({
      where: { id: keyId, orgId },
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Revoke the key (mark as inactive)
    await prisma.aPIKey.update({
      where: { id: keyId },
      data: { 
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // If disconnect=true, close active WebSocket sessions
    if (disconnect) {
      await prisma.webSocketSession.updateMany({
        where: {
          userId: existingKey.userId,
          orgId,
          isActive: true,
        },
        data: {
          isActive: false,
          cursor: {
            revoked: true,
            reason: 'API key revoked',
            keyId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // TODO: Send NOTICE message to active WebSocket connections
      console.log(`Revoked API key ${keyId} and closed active sessions`);
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
      disconnected: disconnect,
    });

  } catch (error) {
    console.error('API key revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Rotate API key (generate new key)
export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string; keyId: string } }
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

    const { orgId, keyId } = params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action !== 'rotate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if key exists
    const existingKey = await prisma.aPIKey.findFirst({
      where: { id: keyId, orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Generate new API key
    const newKeyValue = `gov_key_${randomBytes(32).toString('hex')}`;

    // Update the key with new value
    const rotatedKey = await prisma.aPIKey.update({
      where: { id: keyId },
      data: {
        key: newKeyValue,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      key: {
        id: rotatedKey.id,
        name: rotatedKey.name,
        key: rotatedKey.key, // Return full new key
        scopes: rotatedKey.scopes,
        env: rotatedKey.env,
        isActive: rotatedKey.isActive,
        ipAllow: rotatedKey.ipAllow,
        createdAt: rotatedKey.createdAt,
        updatedAt: rotatedKey.updatedAt,
        expiresAt: rotatedKey.expiresAt,
        createdBy: rotatedKey.user,
      },
      warning: 'Save this new API key now. The old key is no longer valid.',
    });

  } catch (error) {
    console.error('API key rotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
