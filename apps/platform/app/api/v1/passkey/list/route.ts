import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function GET(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-Governs-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Find API key and get user/org
    const keyRecord = await prisma.aPIKey.findUnique({
      where: { key: apiKey },
      include: {
        user: true,
        org: true,
      },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    // Get all passkeys for this user+org
    const passkeys = await prisma.passkey.findMany({
      where: {
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
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
    return NextResponse.json(
      {
        error: 'Failed to list passkeys',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
