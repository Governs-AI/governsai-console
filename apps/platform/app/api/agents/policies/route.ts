import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/agents/policies - Get policies for external agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
    }

    let orgId: string;

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
    
    console.log('Found API key record, orgId:', orgId, 'userId:', userId);

    // Fetch org-level and, if available, user-level policies
    const policies = await prisma.policy.findMany({
      where: {
        orgId,
        isActive: true,
        ...(userId
          ? {
              OR: [
                { userId: null }, // Org-level
                { userId }, // User-specific
              ],
            }
          : { userId: null }),
      },
      orderBy: [
        { priority: 'desc' },
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

    // Split policies into org-level and user-level highest-priority entries
    const orgPolicy = policies.find((p: any) => p.userId === null) || null;
    const userPolicy = userId ? policies.find((p: any) => p.userId === userId) || null : null;

    if (!orgPolicy && !userPolicy) {
      return NextResponse.json({
        policy: null,
        toolMetadata,
        message: 'No active policies found',
        orgId: orgId, // Add orgId to the response
      });
    }

    // Merge with precedence: org overrides user
    const unified = mergePolicies(orgPolicy, userPolicy);

    return NextResponse.json({
      policy: unified.policy,
      toolMetadata,
      orgPolicyId: orgPolicy?.id ?? null,
      userPolicyId: userPolicy?.id ?? null,
      lastUpdated: unified.lastUpdated,
      orgId: orgId,
    });
  } catch (error) {
    console.error('Error fetching agent policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

function mergePolicies(orgPolicy: any | null, userPolicy: any | null) {
  const toObj = (p: any | null) =>
    p
      ? {
          version: p.version,
          defaults: p.defaults || {},
          tool_access: p.toolAccess || {},
          deny_tools: p.denyTools || [],
          allow_tools: p.allowTools || [],
          network_scopes: p.networkScopes || {},
          network_tools: p.networkTools || {},
          on_error: p.onError || {},
        }
      : null;

  const u = toObj(userPolicy) || {
    version: 'v1',
    defaults: {},
    tool_access: {},
    deny_tools: [],
    allow_tools: [],
    network_scopes: {},
    network_tools: {},
    on_error: {},
  };
  const o = toObj(orgPolicy) || null;

  const merged = o ? deepMerge(u, o) : u;
  const lastUpdated = [orgPolicy?.updatedAt, userPolicy?.updatedAt]
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || new Date().toISOString();

  return { policy: merged, lastUpdated };
}

function deepMerge(a: any, b: any) {
  // Objects: recursive merge; Arrays: union unique; Primitives: b overrides a
  if (Array.isArray(a) && Array.isArray(b)) {
    const set = new Set([...(a as any[]), ...(b as any[])]);
    return Array.from(set);
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const result: any = { ...a };
    for (const key of Object.keys(b)) {
      if (key in a) {
        result[key] = deepMerge(a[key], b[key]);
      } else {
        result[key] = b[key];
      }
    }
    return result;
  }
  return b ?? a;
}

function isPlainObject(value: any) {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value.constructor === Object || Object.getPrototypeOf(value) === null)
  );
}
