import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const { userId, orgId } = await requireAuth(request);

    // Get all passkeys for this user+org
    const passkeys = await prisma.passkey.findMany({
      where: {
        userId,
        orgId,
      },
      select: {
        id: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
        transports: true,
        aaguid: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      passkeys: passkeys.map((p) => ({
        id: p.id,
        deviceName: p.deviceName,
        createdAt: p.createdAt.toISOString(),
        lastUsedAt: p.lastUsedAt?.toISOString() || null,
        transports: p.transports,
        aaguid: p.aaguid,
      })),
    });

  } catch (error) {
    console.error('Error listing passkeys:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to list passkeys',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
