import { NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || 'default-org'; // TODO: Get from session/auth

    const policies = await prisma.policy.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, toolAccessMatrix, orgId = 'default-org' } = body; // TODO: Get orgId from session/auth

    if (!name || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const policy = await prisma.policy.create({
      data: {
        name,
        description,
        toolAccessMatrix: toolAccessMatrix || {},
        orgId,
        isActive: true,
      },
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
