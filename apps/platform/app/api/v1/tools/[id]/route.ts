import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireCatalogAdmin, requireCatalogReader } from '@/lib/tool-catalog-auth';
import { visibleTo } from '@/lib/tool-catalog';

/**
 * Admins edit only their own org's entries. A global entry (built-in or
 * pre-dating per-org catalogs) is read-only: POST /api/v1/tools with its
 * toolName creates an org override instead. Another org's entry is a 404.
 */
async function ownEntryOr403(orgId: string, id: string): Promise<NextResponse | null> {
  const tool = await prisma.toolConfig.findUnique({ where: { id }, select: { orgId: true } });
  if (!tool || (tool.orgId !== null && tool.orgId !== orgId)) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }
  if (tool.orgId === null) {
    return NextResponse.json(
      {
        error:
          'Shared catalog entries are read-only. Create an entry with the same toolName for your org to override it.',
      },
      { status: 403 },
    );
  }
  return null;
}

// GET /api/v1/tools/[id] - Get specific tool configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Read: any signed-in user or API key.
    const caller = await requireCatalogReader(request);
    if (caller instanceof NextResponse) return caller;

    // Global entries and the caller org's own; another org's entry is a 404.
    const tool = await prisma.toolConfig.findFirst({
      where: { AND: [visibleTo(caller.orgId), { id: (await params).id }] },
    });

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json({ tool });
  } catch (error) {
    console.error('Error fetching tool:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool' },
      { status: 500 }
    );
  }
}

// PUT /api/v1/tools/[id] - Update tool configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Write: org OWNER/ADMIN in the dashboard only; API keys are read-only.
    const caller = await requireCatalogAdmin(request);
    if (caller instanceof NextResponse) return caller;
    const denied = await ownEntryOr403(caller.orgId, (await params).id);
    if (denied) return denied;

    const body = await request.json();
    const {
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
    } = body;

    const tool = await prisma.toolConfig.update({
      where: { id: (await params).id },
      data: {
        ...(toolName && { toolName }),
        ...(displayName !== undefined && { displayName }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(riskLevel && { riskLevel }),
        ...(scope && { scope }),
        ...(direction && { direction }),
        ...(metadata !== undefined && { metadata }),
        ...(requiresApproval !== undefined && { requiresApproval }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ tool });
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json(
      { error: 'Failed to update tool' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/tools/[id] - Delete tool configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Write: org OWNER/ADMIN in the dashboard only; API keys are read-only.
    const caller = await requireCatalogAdmin(request);
    if (caller instanceof NextResponse) return caller;
    const denied = await ownEntryOr403(caller.orgId, (await params).id);
    if (denied) return denied;

    await prisma.toolConfig.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    console.error('Error deleting tool:', error);
    return NextResponse.json(
      { error: 'Failed to delete tool' },
      { status: 500 }
    );
  }
}

