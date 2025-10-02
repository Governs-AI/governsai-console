import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/agents/policies - Get policies for external agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const apiKey = searchParams.get('apiKey');

    if (!userId || !apiKey) {
      return NextResponse.json({ error: 'userId and apiKey are required' }, { status: 400 });
    }

    let orgId: string;
    let userRecord: any = null;

    // Verify API key and get user/org details
    const keyRecord = await prisma.aPIKey.findFirst({
      where: {
        key: apiKey,
        isActive: true,
      },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                org: true
              }
            }
          }
        },
        org: true
      },
    });

    if (!keyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Use the user from the API key if userId not provided
    if (!userId) {
      userId = keyRecord.userId;
    }

    // Get orgId from API key or user memberships
    orgId = keyRecord.orgId;
    userRecord = keyRecord.user;
    
    console.log('Found API key record, orgId:', orgId, 'userId:', userId);

    // Get active policies for the organization
    const whereClause: any = {
      orgId,
      isActive: true,
    };

    // If userId is provided, get both org-level and user-specific policies
    // if (userId) {
    //   whereClause.OR = [
    //     { userId: null }, // Org-level policies
    //     { userId }, // User-specific policies
    //   ];
    // }

    const policies = await prisma.policy.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { createdAt: 'desc' },
      ],
    });

    // Get tool configurations for all tools
    const toolConfigs = await prisma.toolConfig.findMany({
      where: { isActive: true },
    });

    // Create tool metadata mapping
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

    // Return the most recent policy (highest priority) LATER WE WILL ADD MULTIPLE POLICIES
    const activePolicy = policies[0];

    if (!activePolicy) {
      return NextResponse.json({
        policy: null,
        toolMetadata,
        message: 'No active policies found',
        orgId: orgId, // Add orgId to the response
      });
    }

    return NextResponse.json({
      policy: {
        version: activePolicy.version,
        defaults: activePolicy.defaults,
        tool_access: activePolicy.toolAccess,
        deny_tools: activePolicy.denyTools,
        allow_tools: activePolicy.allowTools,
        network_scopes: activePolicy.networkScopes,
        network_tools: activePolicy.networkTools,
        on_error: activePolicy.onError,
      },
      toolMetadata,
      policyId: activePolicy.id,
      policyName: activePolicy.name,
      lastUpdated: activePolicy.updatedAt,
      orgId: orgId, // Add orgId to the response
    });
  } catch (error) {
    console.error('Error fetching agent policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}
