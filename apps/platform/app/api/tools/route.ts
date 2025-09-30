import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/tools - List all available tools with metadata
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const riskLevel = searchParams.get('riskLevel');
    const scope = searchParams.get('scope');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClause: any = {
      isActive: includeInactive ? undefined : true,
    };

    if (category) whereClause.category = category;
    if (riskLevel) whereClause.riskLevel = riskLevel;
    if (scope) whereClause.scope = scope;

    const tools = await prisma.toolConfig.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { riskLevel: 'asc' },
        { toolName: 'asc' },
      ],
    });

    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}

// POST /api/tools - Create or update tool configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      toolName,
      displayName,
      description,
      category,
      riskLevel,
      scope,
      direction = 'both',
      metadata = {},
      requiresApproval = false,
    } = body;

    if (!toolName || !category || !riskLevel || !scope) {
      return NextResponse.json(
        { error: 'toolName, category, riskLevel, and scope are required' },
        { status: 400 }
      );
    }

    const tool = await prisma.toolConfig.upsert({
      where: { toolName },
      update: {
        displayName,
        description,
        category,
        riskLevel,
        scope,
        direction,
        metadata,
        requiresApproval,
        updatedAt: new Date(),
      },
      create: {
        toolName,
        displayName,
        description,
        category,
        riskLevel,
        scope,
        direction,
        metadata,
        requiresApproval,
        isActive: true,
      },
    });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating tool:', error);
    return NextResponse.json(
      { error: 'Failed to create/update tool' },
      { status: 500 }
    );
  }
}
