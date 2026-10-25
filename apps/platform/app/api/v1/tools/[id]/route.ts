import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireCatalogAdmin, requireCatalogReader } from '@/lib/tool-catalog-auth';

// GET /api/v1/tools/[id] - Get specific tool configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Read: any signed-in user or API key.
    const caller = await requireCatalogReader(request);
    if (caller instanceof NextResponse) return caller;

    const tool = await prisma.toolConfig.findUnique({
      where: { id: (await params).id },
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

