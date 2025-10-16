import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';

const createKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.enum(['decisions', 'approvals', 'dlq', 'toolcalls', 'usage'])).default([]),
  env: z.enum(['development', 'staging', 'production']).default('production'),
  ipAllow: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

// Get API keys for organization
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
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

     const { orgId: orgSlugOrId } = await params;

    // Debug logging
    console.log('API Keys Debug:', {
      orgSlugOrId,
      userId: session.sub,
      sessionValid: !!session
    });

    // First, find the organization by slug or ID
    const org = await prisma.org.findFirst({
      where: {
        OR: [
          { id: orgSlugOrId },
          { slug: orgSlugOrId }
        ]
      },
      select: { id: true, name: true, slug: true }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.log('Found organization:', org);

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId: org.id, // Use the actual orgId from database
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN', 'DEVELOPER'] }, // Developers can view keys
      },
    });

    console.log('Membership found:', membership);

    if (!membership) {
      // Let's also check what memberships exist for this user
      const allMemberships = await prisma.orgMembership.findMany({
        where: { userId: session.sub },
        select: { orgId: true, role: true }
      });
      console.log('All memberships for user:', allMemberships);
      
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        debug: {
          orgId: org.id,
          orgSlug: org.slug,
          userId: session.sub,
          allMemberships
        }
      }, { status: 403 });
    }

    // Get API keys for this organization
    const keys = await prisma.aPIKey.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        key: true, // In production, don't return the actual key
        scopes: true,
        env: true,
        isActive: true,
        lastUsed: true,
        ipAllow: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get usage statistics for each key
    const keysWithStats = await Promise.all(
      keys.map(async (key) => {
        const [sessionCount, usageCount] = await Promise.all([
          prisma.webSocketSession.count({
            where: {
              // Note: We'd need to store keyId in sessions for this to work
              userId: key.user.id,
              orgId: org.id,
              isActive: true,
            },
          }),
          prisma.usageRecord.count({
            where: { apiKeyId: key.id },
          }),
        ]);

        return {
          id: key.id,
          name: key.name,
          keyPreview: `${key.key.slice(0, 12)}...${key.key.slice(-4)}`, // Show preview only
          scopes: key.scopes,
          env: key.env,
          isActive: key.isActive,
          lastUsed: key.lastUsed,
          ipAllow: key.ipAllow,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
          expiresAt: key.expiresAt,
          createdBy: {
            id: key.user.id,
            name: key.user.name,
            email: key.user.email,
          },
          stats: {
            activeSessions: sessionCount,
            totalUsage: usageCount,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      keys: keysWithStats,
      stats: {
        total: keys.length,
        active: keys.filter(k => k.isActive).length,
        expired: keys.filter(k => k.expiresAt && k.expiresAt < new Date()).length,
      },
    });

  } catch (error) {
    console.error('API keys fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new API key
export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
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

     const { orgId: orgSlugOrId } = await params;
    const body = await request.json();
    const { name, scopes, env, ipAllow, expiresAt } = createKeySchema.parse(body);

    // First, find the organization by slug or ID
    const org = await prisma.org.findFirst({
      where: {
        OR: [
          { id: orgSlugOrId },
          { slug: orgSlugOrId }
        ]
      },
      select: { id: true, name: true, slug: true }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId: org.id, // Use the actual orgId from database
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] }, // Only owners and admins can create keys
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate API key
    const keyValue = `gov_key_${randomBytes(32).toString('hex')}`;

    // Create the API key
    const apiKey = await prisma.aPIKey.create({
      data: {
        key: keyValue,
        name,
        userId: session.sub,
        orgId: org.id, // Use the actual orgId from database
        scopes,
        env,
        ipAllow: ipAllow || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
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
        id: apiKey.id,
        name: apiKey.name,
        keyPreview: `${apiKey.key.slice(0, 12)}...${apiKey.key.slice(-4)}`, // Show preview only
        scopes: apiKey.scopes,
        env: apiKey.env,
        isActive: apiKey.isActive,
        lastUsed: apiKey.lastUsed,
        ipAllow: apiKey.ipAllow,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
        expiresAt: apiKey.expiresAt,
        createdBy: {
          id: apiKey.user.id,
          name: apiKey.user.name,
          email: apiKey.user.email,
        },
        stats: {
          activeSessions: 0,
          totalUsage: 0,
        },
        // Include the full key only on creation for the user to copy
        fullKey: apiKey.key,
      },
      warning: 'Save this API key now. You will not be able to see it again.',
    });

  } catch (error) {
    console.error('API key creation error:', error);
    
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
