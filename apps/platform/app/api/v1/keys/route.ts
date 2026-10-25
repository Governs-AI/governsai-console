import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';
import { generateApiKey, keyPreview, PREVIEW_KEY_SCOPE } from '@/lib/api-keys';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth(request);

    const keys = await prisma.aPIKey.findMany({
      where: { orgId, NOT: { scopes: { has: PREVIEW_KEY_SCOPE } } },
      orderBy: { createdAt: 'desc' },
    });

    // Only the hash is stored; the prefix identifies the key in the UI.
    const safeKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      keyPreview: keyPreview(key.keyPrefix),
      scopes: key.scopes,
      issuedAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
    }));

    return NextResponse.json(safeKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name: rawName, label, scopes } = body;
    const name = typeof rawName === 'string' ? rawName : label;

    if (!name || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { orgId, userId } = await requireAuth(request);

    // Only the hash and a display prefix are stored. The full key is in this
    // response and nowhere else.
    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    const apiKey = await prisma.aPIKey.create({
      data: {
        name,
        scopes,
        keyHash,
        keyPrefix,
        userId,
        orgId,
        isActive: true,
      },
    });

    // Return the key value only once for security
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      key: rawKey, // Only returned on creation
      keyPreview: keyPreview(apiKey.keyPrefix),
      issuedAt: apiKey.createdAt,
      isActive: apiKey.isActive,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
