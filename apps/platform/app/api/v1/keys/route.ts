import { NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || 'default-org'; // TODO: Get from session/auth

    const keys = await prisma.apiKey.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    // Don't return the actual key values for security
    const safeKeys = keys.map(key => ({
      id: key.id,
      label: key.label,
      scopes: key.scopes,
      issuedAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
    }));

    return NextResponse.json(safeKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { label, scopes, orgId = 'default-org' } = body; // TODO: Get orgId from session/auth

    if (!label || !scopes || !Array.isArray(scopes)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a secure API key
    const keyValue = `gai_${randomBytes(32).toString('hex')}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        label,
        scopes,
        keyValue,
        orgId,
        isActive: true,
      },
    });

    // Return the key value only once for security
    return NextResponse.json({
      id: apiKey.id,
      label: apiKey.label,
      scopes: apiKey.scopes,
      keyValue, // Only returned on creation
      issuedAt: apiKey.createdAt,
      isActive: apiKey.isActive,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
