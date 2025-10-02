import { NextRequest, NextResponse } from 'next/server';
import { checkBudget } from '@governs-ai/db';
import { calculateCost, getProvider, getCostType, estimateTokens } from '@governs-ai/common-utils';
import { prisma } from '@governs-ai/db';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { tool, raw_text, scope, corr_id, policy_config, tool_config } = body;

    // Extract orgId and userId
    const orgId = keyRecord.org.id;
    const userId = keyRecord.user.id;

    // Estimate cost BEFORE making the AI call
    // This requires knowing the model from policy_config or tool_config
    const model = tool_config?.metadata?.model || policy_config?.model || 'gpt-4'; // Default fallback
    const estimatedInputTokens = estimateTokens(raw_text || ''); // Rough estimate
    const estimatedCost = calculateCost(model, estimatedInputTokens, estimatedInputTokens * 2);

    // Check budget
    const budgetStatus = await checkBudget({
      orgId,
      userId,
      estimatedCost,
    });

    if (!budgetStatus.allowed) {
      // Log budget block event
      await prisma.auditLog.create({
        data: {
          userId,
          orgId,
          action: 'budget_block',
          resource: 'precheck',
          details: {
            reason: budgetStatus.reason,
            currentSpend: budgetStatus.currentSpend,
            limit: budgetStatus.limit,
            estimatedCost,
            model,
            tool,
          },
        },
      });

      return NextResponse.json(
        {
          decision: 'deny',
          raw_text_out: raw_text,
          reasons: [
            `budget_exceeded:${budgetStatus.reason}`,
            `current:${budgetStatus.currentSpend.toFixed(2)}`,
            `limit:${budgetStatus.limit.toFixed(2)}`,
          ],
          policy_id: 'budget-limit',
          ts: Math.floor(Date.now() / 1000),
          budget_status: budgetStatus,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // Budget check passed, continue with normal precheck logic
    // For now, we'll just return allow, but this is where you'd add other policy checks
    
    // Log successful precheck
    await prisma.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'precheck_allow',
        resource: 'precheck',
        details: {
          tool,
          model,
          estimatedCost,
          budgetStatus,
        },
      },
    });

    return NextResponse.json({
      decision: 'allow',
      raw_text_out: raw_text,
      reasons: ['budget_check_passed'],
      policy_id: 'precheck',
      ts: Math.floor(Date.now() / 1000),
      budget_status: budgetStatus,
    });
  } catch (error) {
    console.error('Precheck error:', error);
    
    // Get organization budget settings for error handling
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { budgetOnError: true }
    });
    
    const onError = org?.budgetOnError || 'block';
    
    if (onError === 'pass') {
      // Allow request to proceed despite error
      console.warn('Budget check failed, allowing request (on_error=pass)');
      return NextResponse.json({
        decision: 'allow',
        raw_text_out: body?.raw_text || '',
        reasons: ['budget_check_failed_but_allowed'],
        policy_id: 'precheck-error',
        ts: Math.floor(Date.now() / 1000),
      });
    } else {
      // Block request on error (fail-safe)
      return NextResponse.json({
        decision: 'deny',
        reasons: ['budget_check_failed'],
        policy_id: 'budget-error',
        ts: Math.floor(Date.now() / 1000),
      }, { status: 500 });
    }
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
