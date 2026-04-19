import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';
import { requireAuth } from '@/lib/session';
import { syncKeyToPrecheck } from '@/lib/precheck-key-sync';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth(request);

    const keys = await prisma.aPIKey.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    // Don't return the actual key values for security
    const safeKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
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

    // Generate a secure API key
    const keyValue = `gai_${randomBytes(32).toString('hex')}`;

    const apiKey = await prisma.aPIKey.create({
      data: {
        name,
        scopes,
        key: keyValue,
        userId,
        orgId,
        isActive: true,
      },
    });

    syncKeyToPrecheck(keyValue, userId)
      .catch(err => console.error('[api-keys] precheck sync failed (non-fatal):', err));

    // Return the key value only once for security
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      key: apiKey.key, // Only returned on creation
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
