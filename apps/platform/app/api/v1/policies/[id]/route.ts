import { NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const orgId = 'default-org'; // TODO: Get from session/auth

    const policy = await prisma.policy.findFirst({
      where: { id, orgId },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, toolAccessMatrix, isActive } = body;
    const orgId = 'default-org'; // TODO: Get from session/auth

    // Verify the policy belongs to the organization
    const policy = await prisma.policy.findFirst({
      where: { id, orgId },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(toolAccessMatrix && { toolAccessMatrix }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updatedPolicy);
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const orgId = 'default-org'; // TODO: Get from session/auth

    // Verify the policy belongs to the organization
    const policy = await prisma.policy.findFirst({
      where: { id, orgId },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    await prisma.policy.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
