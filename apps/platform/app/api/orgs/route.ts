import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrganization, generateOrgSlug } from '@/lib/auth';
import { requireAuth } from '@/lib/session';
import { prisma } from '@governs-ai/db';

const createOrgSchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = requireAuth(request);
    
    const body = await request.json();
    const { name } = createOrgSchema.parse(body);

    const orgSlug = generateOrgSlug(name);
    
    // Check if org slug already exists
    const existingOrg = await prisma.org.findUnique({
      where: { slug: orgSlug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization name already taken' },
        { status: 400 }
      );
    }

    const org = await createOrganization(name, orgSlug, userId);

    return NextResponse.json({
      success: true,
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
    });

  } catch (error) {
    console.error('Create org error:', error);
    
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

export async function GET(request: NextRequest) {
  try {
    const { userId } = requireAuth(request);
    
    const memberships = await prisma.orgMembership.findMany({
      where: { userId },
      include: { org: true },
    });

    return NextResponse.json({
      success: true,
      organizations: memberships.map(m => ({
        id: m.org.id,
        name: m.org.name,
        slug: m.org.slug,
        role: m.role,
      })),
    });

  } catch (error) {
    console.error('Get orgs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
