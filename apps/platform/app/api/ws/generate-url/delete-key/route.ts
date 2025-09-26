import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const deleteKeySchema = z.object({
  apiKeyId: z.string().min(1),
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
    const { apiKeyId } = deleteKeySchema.parse(body);

    // First, verify the API key belongs to the current user/org
    const existingKey = await prisma.aPIKey.findFirst({
      where: {
        id: apiKeyId,
        userId,
        orgId,
        isActive: true, // Only allow disabling active keys
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found or already disabled' },
        { status: 404 }
      );
    }

    // Soft delete: Set isActive to false instead of deleting the record
    const disabledKey = await prisma.aPIKey.update({
      where: {
        id: apiKeyId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Log the API key disabling for audit
    await prisma.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'api_key_disabled',
        resource: 'api_key',
        details: {
          apiKeyId: disabledKey.id,
          apiKeyName: disabledKey.name,
          reason: 'user_requested_disable',
          previouslyActive: true,
          disabledAt: new Date().toISOString(),
        },
      },
    });

    // Also disable any active WebSocket sessions using this key
    await prisma.webSocketSession.updateMany({
      where: {
        userId,
        orgId,
        isActive: true,
        // Note: WebSocket sessions don't directly reference API keys,
        // but we can disable sessions for this user/org as a precaution
      },
      data: {
        isActive: false,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'API key has been disabled successfully',
      apiKey: {
        id: disabledKey.id,
        name: disabledKey.name,
        disabledAt: disabledKey.updatedAt,
      },
    });

  } catch (error) {
    console.error('API key disable error:', error);
    
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
