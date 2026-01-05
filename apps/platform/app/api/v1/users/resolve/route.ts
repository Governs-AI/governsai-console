/**
 * User Resolution API Endpoint
 *
 * POST /api/v1/users/resolve
 *
 * Resolves external user IDs to internal user IDs.
 * Auto-creates users if they don't exist.
 *
 * Authentication: API Key (X-Governs-Key header)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { userResolverService } from '@/lib/services/user-resolver';

/**
 * POST /api/v1/users/resolve
 *
 * Request body:
 * {
 *   externalUserId: string;
 *   externalSource?: string;  // Defaults to 'default'
 *   email?: string;
 *   name?: string;
 * }
 *
 * Response:
 * {
 *   success: true,
 *   internalUserId: string;
 *   created: boolean;
 *   user: {
 *     id: string;
 *     email: string;
 *     name: string | null;
 *     externalId: string | null;
 *     externalSource: string | null;
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Auth: X-Governs-Key (API key)
    const apiKeyHeader = req.headers.get('x-governs-key');

    if (!apiKeyHeader) {
      return NextResponse.json(
        { error: 'Missing API key. Provide X-Governs-Key header.' },
        { status: 401 }
      );
    }

    // Verify API key and get org context
    const apiKey = await prisma.aPIKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
      select: { userId: true, orgId: true },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
    }

    const { orgId } = apiKey;

    // Parse request body
    const body = await req.json();
    const { externalUserId, externalSource = 'default', email, name } = body;

    // Validate required fields
    if (!externalUserId || typeof externalUserId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid externalUserId' },
        { status: 400 }
      );
    }

    // Validate externalSource format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(externalSource)) {
      return NextResponse.json(
        {
          error:
            'Invalid externalSource format. Use only alphanumeric characters, hyphens, and underscores.',
        },
        { status: 400 }
      );
    }

    // Resolve user (creates if doesn't exist)
    const result = await userResolverService.resolveExternalUser({
      externalUserId,
      externalSource,
      orgId,
      email,
      name,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error resolving external user:', error);

    // Handle specific errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to resolve user' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/users/resolve?externalUserId=xxx&externalSource=xxx
 *
 * Lookup user by external ID without creating
 */
export async function GET(req: NextRequest) {
  try {
    // Auth: X-Governs-Key (API key)
    const apiKeyHeader = req.headers.get('x-governs-key');

    if (!apiKeyHeader) {
      return NextResponse.json(
        { error: 'Missing API key. Provide X-Governs-Key header.' },
        { status: 401 }
      );
    }

    // Verify API key
    const apiKey = await prisma.aPIKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
      select: { userId: true, orgId: true },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const externalUserId = searchParams.get('externalUserId');
    const externalSource = searchParams.get('externalSource') || 'default';

    if (!externalUserId) {
      return NextResponse.json({ error: 'Missing externalUserId parameter' }, { status: 400 });
    }

    // Lookup user
    const user = await userResolverService.getUserByExternalId(externalUserId, externalSource);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Error looking up external user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup user' },
      { status: 500 }
    );
  }
}
