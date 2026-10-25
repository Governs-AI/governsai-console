import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { ensureToolCatalog, mergeCatalog, visibleTo } from '@/lib/tool-catalog';
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

    await ensureToolCatalog();

    const rows = await prisma.toolConfig.findMany({
      where: visibleTo(caller.orgId),
      orderBy: [
        { category: 'asc' },
        { riskLevel: 'asc' },
        { toolName: 'asc' },
      ],
    });

    // Global entries plus this org's own; an org entry overrides a global one.
    // Filters apply after the merge, so an org can switch a global tool off by
    // overriding it with isActive=false.
    const tools = mergeCatalog(rows, caller.orgId).filter(
      (tool) =>
        (includeInactive || tool.isActive) &&
        (!category || tool.category === category) &&
        (!riskLevel || tool.riskLevel === riskLevel) &&
        (!scope || tool.scope === scope),
    );

    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}

// POST /api/v1/tools - Create or update one of the caller org's catalog entries.
// Using the name of a global entry creates an org override; the global entry
// itself is never modified.
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
      isActive = true,
    } = body;

    if (!toolName || !category || !riskLevel || !scope) {
      return NextResponse.json(
        { error: 'toolName, category, riskLevel, and scope are required' },
        { status: 400 }
      );
    }

    const tool = await prisma.toolConfig.upsert({
      where: { orgId_toolName: { orgId: caller.orgId, toolName } },
      update: {
        displayName,
        description,
        category,
        riskLevel,
        scope,
        direction,
        metadata,
        requiresApproval,
        isActive,
        updatedAt: new Date(),
      },
      create: {
        orgId: caller.orgId,
        toolName,
        displayName,
        description,
        category,
        riskLevel,
        scope,
        direction,
        metadata,
        requiresApproval,
        isActive,
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

