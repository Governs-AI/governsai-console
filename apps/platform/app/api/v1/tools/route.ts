import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { ensureToolCatalog } from '@/lib/tool-catalog';
import { requireCatalogAdmin, requireCatalogReader } from '@/lib/tool-catalog-auth';

// GET /api/v1/tools - List all available tools with metadata
export async function GET(request: NextRequest) {
  try {
    // Read: any signed-in user or API key.
    const caller = await requireCatalogReader(request);
    if (caller instanceof NextResponse) return caller;

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

    await ensureToolCatalog();

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

// POST /api/v1/tools - Create or update tool configuration
export async function POST(request: NextRequest) {
  try {
    // Write: org OWNER/ADMIN in the dashboard only; API keys are read-only.
    const caller = await requireCatalogAdmin(request);
    if (caller instanceof NextResponse) return caller;

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

