import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/policies - List policies for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('orgId');
    const userId = searchParams.get('userId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const whereClause: any = {
      orgId,
      isActive: includeInactive ? undefined : true,
    };

    // If userId is provided, get both org-level and user-specific policies
    if (userId) {
      whereClause.OR = [
        { userId: null }, // Org-level policies
        { userId }, // User-specific policies
      ];
    }

    const policies = await prisma.policy.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

// POST /api/policies - Create a new policy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId,
      userId,
      name,
      description,
      version = 'v1',
      defaults,
      toolAccess = {},
      denyTools = [],
      allowTools = [],
      networkScopes = [],
      networkTools = [],
      onError = 'block',
      priority = 0,
    } = body;

    if (!orgId || !name) {
      return NextResponse.json(
        { error: 'orgId and name are required' },
        { status: 400 }
      );
    }

    const policy = await prisma.policy.create({
      data: {
        orgId,
        userId: userId || null,
        name,
        description,
        version,
        defaults,
        toolAccess,
        denyTools,
        allowTools,
        networkScopes,
        networkTools,
        onError,
        priority,
        isActive: true,
      },
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    );
  }
}
