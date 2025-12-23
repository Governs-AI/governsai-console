import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

// Precheck API - forwards requests to external precheck module
// Policy is fetched from database based on API key, not from client request

const PRECHECK_SERVICE_URL = process.env.PRECHECK_URL || 'http://localhost:1234';

interface PrecheckRequestBody {
  tool: string;
  raw_text: string;
  scope?: string;
  corr_id?: string;
  tags?: string[];
  tool_config?: Record<string, any>;
  budget_context?: {
    monthly_limit?: number;
    current_spend?: number;
    llm_spend?: number;
    purchase_spend?: number;
    budget_type?: string;
  };
}

interface PolicyConfig {
  version: string;
  defaults: any;
  tool_access: any;
  deny_tools: string[];
  allow_tools: string[];
  network_scopes: string[];
  network_tools: string[];
  on_error: string;
}

export async function POST(req: NextRequest) {
  let body: PrecheckRequestBody = {} as PrecheckRequestBody;
  
  try {
    // Get API key from header
    const apiKey = req.headers.get('X-Governs-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Find API key and get user/org
    const keyRecord = await prisma.aPIKey.findUnique({
      where: { key: apiKey },
      include: {
        user: true,
        org: true,
      },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    body = await req.json();
    const { 
      tool, 
      raw_text, 
      scope, 
      corr_id, 
      tags,
      tool_config,
      budget_context= {} // If its not provided, its enternal module, we don't need to pass in the budget context
    } = body;

    // Extract orgId and userId
    const orgId = keyRecord.org.id;
    const userId = keyRecord.user.id;

    // Fetch active policy from database (highest priority)
    // Check user-specific policy first, then org-level policy
    const policy = await prisma.policy.findFirst({
      where: {
        orgId,
        isActive: true,
        OR: [
          { userId: userId }, // User-specific policy (highest priority)
          { userId: null },   // Org-level policy (fallback)
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (!policy) {
      return NextResponse.json({
        error: 'No active policy found for organization',
        orgId,
        userId,
      }, { status: 403 });
    }

    // Build policy_config from database policy
    const policy_config: PolicyConfig = {
      version: policy.version,
      defaults: policy.defaults as any,
      tool_access: policy.toolAccess as any,
      deny_tools: policy.denyTools as string[],
      allow_tools: policy.allowTools as string[],
      network_scopes: policy.networkScopes as string[],
      network_tools: policy.networkTools as string[],
      on_error: policy.onError,
    };

    // Forward the request to the external precheck module
    try {
      const precheckResponse = await fetch(`${PRECHECK_SERVICE_URL}/api/v1/precheck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Governs-Key': apiKey,
        },
        body: JSON.stringify({
          tool,
          raw_text,
          scope,
          corr_id,
          tags,
          policy_config,
          tool_config,
          budget_context,
          // Add user/org context
          user_id: userId,
          org_id: orgId,
        }),
      });

      if (!precheckResponse.ok) {
        throw new Error(`Precheck service returned ${precheckResponse.status}: ${precheckResponse.statusText}`);
      }

      const precheckResult = await precheckResponse.json();

      // Log the precheck result
      await prisma.auditLog.create({
        data: {
          userId,
          orgId,
          action: `precheck_${precheckResult.decision || 'unknown'}`,
          resource: 'precheck',
          details: {
            tool,
            scope,
            corr_id,
            tags,
            decision: precheckResult.decision,
            reasons: precheckResult.reasons,
            policy_id: policy.id, // Database policy ID used
            policy_name: policy.name,
            policy_priority: policy.priority,
            external_policy_id: precheckResult.policy_id, // From external service
            tool_config,
          },
        },
      });

      // Return 200 OK - the API call succeeded, regardless of the policy decision
      // Clients should check the 'decision' field, not the HTTP status code
      return NextResponse.json(precheckResult, { status: 200 });

    } catch (fetchError) {
      console.error('Error calling external precheck service:', fetchError);
      throw fetchError; // Will be caught by outer try-catch
    }
  } catch (error) {
    console.error('Precheck API error:', error);
    
    // Return error response
    return NextResponse.json({
      decision: 'deny',
      raw_text_out: body?.raw_text || '',
      reasons: ['precheck_service_error', error instanceof Error ? error.message : 'Unknown error'],
      policy_id: 'precheck-error',
      ts: Math.floor(Date.now() / 1000),
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Governs-Key',
    },
  });
}
