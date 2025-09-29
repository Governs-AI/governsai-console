import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { validateNetworkRule, getClientIP } from '@/lib/network-access';

const createRuleSchema = z.object({
  kind: z.enum(['origin', 'ip', 'cidr']),
  value: z.string().min(1),
  label: z.string().optional(),
  notes: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const updateRuleSchema = z.object({
  isActive: z.boolean().optional(),
  label: z.string().optional(),
  notes: z.string().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Get network access rules for organization
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    // Get session token from cookies
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

     const { orgId } = await params;

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] }, // Only owners and admins can view network rules
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get network access rules
    const rules = await prisma.networkAccessRule.findMany({
      where: { orgId },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Get current user's IP for quick add suggestions
    const currentIP = getClientIP(request);

    return NextResponse.json({
      success: true,
      rules: rules.map(rule => ({
        id: rule.id,
        kind: rule.kind,
        value: rule.value,
        label: rule.label,
        notes: rule.notes,
        isActive: rule.isActive,
        expiresAt: rule.expiresAt,
        createdBy: rule.createdBy,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
      suggestions: {
        currentIP,
        currentOrigin: request.headers.get('origin'),
      },
      stats: {
        total: rules.length,
        active: rules.filter(r => r.isActive).length,
        expired: rules.filter(r => r.expiresAt && r.expiresAt < new Date()).length,
      },
    });

  } catch (error) {
    console.error('Network access rules fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new network access rule
export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    // Get session token from cookies
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

     const { orgId } = await params;
    const body = await request.json();
    const { kind, value, label, notes, expiresAt } = createRuleSchema.parse(body);

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] }, // Only owners and admins can create network rules
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate the network rule
    const validation = validateNetworkRule(kind, value);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid network rule', detail: validation.error },
        { status: 400 }
      );
    }

    // Check for duplicate rules
    const existingRule = await prisma.networkAccessRule.findFirst({
      where: {
        orgId,
        kind,
        value,
        isActive: true,
      },
    });

    if (existingRule) {
      return NextResponse.json(
        { error: 'Rule already exists', detail: 'A rule with the same kind and value already exists' },
        { status: 409 }
      );
    }

    // Create the rule
    const rule = await prisma.networkAccessRule.create({
      data: {
        orgId,
        kind,
        value,
        label,
        notes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.sub,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        id: rule.id,
        kind: rule.kind,
        value: rule.value,
        label: rule.label,
        notes: rule.notes,
        isActive: rule.isActive,
        expiresAt: rule.expiresAt,
        createdBy: rule.createdBy,
        createdAt: rule.createdAt,
      },
    });

  } catch (error) {
    console.error('Network access rule creation error:', error);
    
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
