import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/agents/tools - Register tools used by an external agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentId,
      orgId,
      tools, // Array of tool names being used
      metadata = {},
    } = body;

    if (!agentId || !orgId || !Array.isArray(tools)) {
      return NextResponse.json(
        { error: 'agentId, orgId, and tools array are required' },
        { status: 400 }
      );
    }

    // Get tool metadata for the provided tools
    const toolConfigs = await prisma.toolConfig.findMany({
      where: {
        toolName: { in: tools },
        isActive: true,
      },
    });

    // Create a mapping of tool names to their metadata
    const toolMetadata = toolConfigs.reduce((acc, tool) => {
      acc[tool.toolName] = {
        tool_name: tool.toolName,
        scope: tool.scope,
        direction: tool.direction,
        metadata: {
          category: tool.category,
          risk_level: tool.riskLevel,
          requires_approval: tool.requiresApproval,
        },
      };
      return acc;
    }, {} as Record<string, any>);

    // Log the agent tool usage for analytics
    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'agent_tools_registered',
        resource: 'agent',
        details: {
          agentId,
          tools,
          toolCount: tools.length,
          metadata,
        },
      },
    });

    return NextResponse.json({
      agentId,
      orgId,
      tools: toolMetadata,
      registeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error registering agent tools:', error);
    return NextResponse.json(
      { error: 'Failed to register agent tools' },
      { status: 500 }
    );
  }
}

// GET /api/agents/tools - Get tools used by agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const agentId = searchParams.get('agentId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Get recent agent tool registrations
    const whereClause: any = {
      orgId,
      action: 'agent_tools_registered',
    };

    if (agentId) {
      whereClause.details = {
        path: ['agentId'],
        equals: agentId,
      };
    }

    const agentTools = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 registrations
    });

    return NextResponse.json({ agentTools });
  } catch (error) {
    console.error('Error fetching agent tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent tools' },
      { status: 500 }
    );
  }
}
