import { NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const orgId = 'default-org'; // TODO: Get from session/auth

    // Verify the key belongs to the organization
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, orgId },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;
    const orgId = 'default-org'; // TODO: Get from session/auth

    // Verify the key belongs to the organization
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, orgId },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({
      id: updatedKey.id,
      label: updatedKey.label,
      scopes: updatedKey.scopes,
      issuedAt: updatedKey.createdAt,
      lastUsed: updatedKey.lastUsed,
      isActive: updatedKey.isActive,
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
