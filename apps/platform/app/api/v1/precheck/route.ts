import { NextRequest, NextResponse } from 'next/server';
import { calculateCost, getProvider, getCostType, estimateTokens } from '@governs-ai/common-utils';
import { prisma } from '@governs-ai/db';

// Precheck API is now stateless - no database queries for budget data

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
    const { 
      tool, 
      raw_text, 
      scope, 
      corr_id, 
      tags,
      policy_config, 
      tool_config,
      budget_context // ← Budget data passed in request
    } = body;

    // Extract orgId and userId
    const orgId = keyRecord.org.id;
    const userId = keyRecord.user.id;

    // Estimate cost BEFORE making the AI call
    // Extract model from policy_config (official format)
    const model = policy_config?.model || 'gpt-4'; // Default fallback
    const estimatedInputTokens = estimateTokens(raw_text || ''); // Rough estimate
    const estimatedCost = calculateCost(model, estimatedInputTokens, estimatedInputTokens * 2);

    // Check for purchase amounts in the request (official format)
    let estimatedPurchaseAmount = 0;
    if (tool_config?.metadata?.purchase_amount) {
      estimatedPurchaseAmount = Number(tool_config.metadata.purchase_amount);
    } else if (tool_config?.metadata?.amount) {
      estimatedPurchaseAmount = Number(tool_config.metadata.amount);
    }

    // Check if tool is explicitly denied in policy_config
    const deniedTools = policy_config?.deny_tools || [];
    if (deniedTools.includes(tool)) {
      return NextResponse.json({
        decision: 'deny',
        raw_text_out: raw_text,
        reasons: [`Tool '${tool}' is explicitly denied by policy`],
        policy_id: 'tool-denied',
        ts: Math.floor(Date.now() / 1000),
      }, { status: 403 });
    }

    // Check tool access permissions
    const toolAccess = policy_config?.tool_access || {};
    const toolPolicy = toolAccess[tool];
    
    if (toolPolicy && toolPolicy.action === 'block') {
      return NextResponse.json({
        decision: 'deny',
        raw_text_out: raw_text,
        reasons: [`Tool '${tool}' is blocked by policy configuration`],
        policy_id: 'tool-blocked',
        ts: Math.floor(Date.now() / 1000),
      }, { status: 403 });
    }

    // Check if tool requires approval and handle accordingly
    if (tool_config?.metadata?.requires_approval === true) {
      return NextResponse.json({
        decision: 'confirm',
        raw_text_out: raw_text,
        reasons: [`Tool '${tool}' requires approval due to high risk level`],
        policy_id: 'tool-approval-required',
        ts: Math.floor(Date.now() / 1000),
        budget_info: {
          monthly_limit: 0, // Will be filled below
          current_spend: 0,
          llm_spend: 0,
          purchase_spend: 0,
          remaining_budget: 0,
          estimated_cost: estimatedCost,
          estimated_purchase: estimatedPurchaseAmount,
          projected_total: estimatedCost + estimatedPurchaseAmount,
          percent_used: 0,
          budget_type: 'organization',
        },
      });
    }

    // Stateless budget checking using passed budget_context
    let budgetStatus = { allowed: true, currentSpend: 0, limit: 0, remaining: 0, percentUsed: 0, reason: 'budget_ok' };
    let budgetInfo = {
      monthly_limit: 0,
      current_spend: 0,
      llm_spend: 0,
      purchase_spend: 0,
      remaining_budget: 0,
      estimated_cost: estimatedCost,
      estimated_purchase: estimatedPurchaseAmount,
      projected_total: estimatedCost + estimatedPurchaseAmount,
      percent_used: 0,
      budget_type: 'organization'
    };

    // If budget context is provided, perform budget check
    if (budget_context) {
      const projectedTotal = budget_context.current_spend + estimatedCost + estimatedPurchaseAmount;
      const budgetLimit = budget_context.monthly_limit || 0;
      
      if (projectedTotal > budgetLimit && budgetLimit > 0) {
        budgetStatus = {
          allowed: false,
          currentSpend: budget_context.current_spend,
          limit: budgetLimit,
          remaining: budgetLimit - budget_context.current_spend,
          percentUsed: (budget_context.current_spend / budgetLimit) * 100,
          reason: estimatedPurchaseAmount > 0 ? 'purchase_budget_exceeded' : 'llm_budget_exceeded'
        };
      } else {
        budgetStatus = {
          allowed: true,
          currentSpend: budget_context.current_spend,
          limit: budgetLimit,
          remaining: budgetLimit - budget_context.current_spend,
          percentUsed: budgetLimit > 0 ? (budget_context.current_spend / budgetLimit) * 100 : 0,
          reason: 'budget_ok'
        };
      }

      budgetInfo = {
        monthly_limit: budgetLimit,
        current_spend: budget_context.current_spend,
        llm_spend: budget_context.llm_spend || 0,
        purchase_spend: budget_context.purchase_spend || 0,
        remaining_budget: budgetLimit - budget_context.current_spend,
        estimated_cost: estimatedCost,
        estimated_purchase: estimatedPurchaseAmount,
        projected_total: projectedTotal,
        percent_used: budgetLimit > 0 ? (budget_context.current_spend / budgetLimit) * 100 : 0,
        budget_type: budget_context.budget_type || 'organization'
      };
    }

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
            estimatedPurchaseAmount,
            model,
            tool,
            scope,
            corr_id,
            tags,
            policy_config,
            tool_config,
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
            estimatedPurchaseAmount > 0 ? `purchase:${estimatedPurchaseAmount.toFixed(2)}` : `llm_cost:${estimatedCost.toFixed(2)}`,
          ],
          policy_id: 'budget-limit',
          ts: Math.floor(Date.now() / 1000),
          budget_status: budgetStatus,
          budget_info: budgetInfo,
          // Additional fields for official format compatibility
          tool: tool,
          scope: scope,
          corr_id: corr_id,
          tags: tags,
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
          scope,
          corr_id,
          tags,
          model,
          estimatedCost,
          estimatedPurchaseAmount,
          budgetStatus,
          policy_config,
          tool_config,
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
      budget_info: budgetInfo,
      // Additional fields for official format compatibility
      tool: tool,
      scope: scope,
      corr_id: corr_id,
      tags: tags,
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
