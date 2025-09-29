import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const updateRuleSchema = z.object({
  isActive: z.boolean().optional(),
  label: z.string().optional(),
  notes: z.string().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Get specific network access rule
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string; ruleId: string } }
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

    const { orgId, ruleId } = await params;

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the rule
    const rule = await prisma.networkAccessRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

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
        updatedAt: rule.updatedAt,
      },
    });

  } catch (error) {
    console.error('Network access rule fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update network access rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string; ruleId: string } }
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

    const { orgId, ruleId } = await params;
    const body = await request.json();
    const updateData = updateRuleSchema.parse(body);

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if rule exists
    const existingRule = await prisma.networkAccessRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Update the rule
    const updatedRule = await prisma.networkAccessRule.update({
      where: { id: ruleId },
      data: {
        ...updateData,
        expiresAt: updateData.expiresAt === null ? null : 
                   updateData.expiresAt ? new Date(updateData.expiresAt) : existingRule.expiresAt,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        id: updatedRule.id,
        kind: updatedRule.kind,
        value: updatedRule.value,
        label: updatedRule.label,
        notes: updatedRule.notes,
        isActive: updatedRule.isActive,
        expiresAt: updatedRule.expiresAt,
        createdBy: updatedRule.createdBy,
        createdAt: updatedRule.createdAt,
        updatedAt: updatedRule.updatedAt,
      },
    });

  } catch (error) {
    console.error('Network access rule update error:', error);
    
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

// Delete network access rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string; ruleId: string } }
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

    const { orgId, ruleId } = await params;

    // Check if user has access to this organization
    const membership = await prisma.orgMembership.findFirst({
      where: {
        orgId,
        userId: session.sub,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if rule exists
    const existingRule = await prisma.networkAccessRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Delete the rule
    await prisma.networkAccessRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({
      success: true,
      message: 'Network access rule deleted successfully',
    });

  } catch (error) {
    console.error('Network access rule deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
