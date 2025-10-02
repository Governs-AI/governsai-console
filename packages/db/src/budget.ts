import { PrismaClient, Prisma } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

export interface BudgetStatus {
  allowed: boolean;
  currentSpend: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  reason?: string;
}

export interface BudgetCheckParams {
  orgId: string;
  userId: string;
  estimatedCost: number;
  estimatedPurchaseAmount?: number; // For real-world purchases
}

/**
 * Check if a request is within budget limits
 * Checks both org-level and user-level budgets
 */
export async function checkBudget(params: BudgetCheckParams): Promise<BudgetStatus> {
  const { orgId, userId, estimatedCost, estimatedPurchaseAmount = 0 } = params;
  
  // Get organization budget settings
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { budgetEnabled: true, budgetOnError: true }
  });
  
  // Skip budget check if disabled for this organization
  if (!org?.budgetEnabled) {
    return {
      allowed: true,
      currentSpend: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
    };
  }
  
  // Skip budget check for free/local models and no purchases
  if (estimatedCost === 0 && estimatedPurchaseAmount === 0) {
    return {
      allowed: true,
      currentSpend: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
    };
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Check organization-level budget
  const orgBudget = await prisma.budgetLimit.findFirst({
    where: {
      orgId,
      userId: null, // Org-level
      isActive: true,
    },
  });

  if (orgBudget) {
    const orgSpend = await getCurrentSpend(orgId, null, monthStart, monthEnd);
    const totalEstimatedCost = estimatedCost + estimatedPurchaseAmount;
    const projectedSpend = orgSpend + totalEstimatedCost;

    if (projectedSpend > Number(orgBudget.monthlyLimit)) {
      return {
        allowed: false,
        currentSpend: orgSpend,
        limit: Number(orgBudget.monthlyLimit),
        remaining: Number(orgBudget.monthlyLimit) - orgSpend,
        percentUsed: (orgSpend / Number(orgBudget.monthlyLimit)) * 100,
        reason: estimatedPurchaseAmount > 0 ? 'organization_purchase_budget_exceeded' : 'organization_budget_exceeded',
      };
    }

    // Check if alert threshold reached
    if (orgBudget.alertAt && orgSpend >= Number(orgBudget.alertAt)) {
      await createBudgetAlert({
        orgId,
        userId: null,
        type: 'threshold_reached',
        message: `Organization budget at ${((orgSpend / Number(orgBudget.monthlyLimit)) * 100).toFixed(1)}%`,
        threshold: orgBudget.alertAt,
      });
    }
  }

  // Check user-level budget
  const userBudget = await prisma.budgetLimit.findFirst({
    where: {
      orgId,
      userId,
      isActive: true,
    },
  });

  if (userBudget) {
    const userSpend = await getCurrentSpend(orgId, userId, monthStart, monthEnd);
    const totalEstimatedCost = estimatedCost + estimatedPurchaseAmount;
    const projectedSpend = userSpend + totalEstimatedCost;

    if (projectedSpend > Number(userBudget.monthlyLimit)) {
      return {
        allowed: false,
        currentSpend: userSpend,
        limit: Number(userBudget.monthlyLimit),
        remaining: Number(userBudget.monthlyLimit) - userSpend,
        percentUsed: (userSpend / Number(userBudget.monthlyLimit)) * 100,
        reason: estimatedPurchaseAmount > 0 ? 'user_purchase_budget_exceeded' : 'user_budget_exceeded',
      };
    }

    // Check if alert threshold reached
    if (userBudget.alertAt && userSpend >= Number(userBudget.alertAt)) {
      await createBudgetAlert({
        orgId,
        userId,
        type: 'threshold_reached',
        message: `User budget at ${((userSpend / Number(userBudget.monthlyLimit)) * 100).toFixed(1)}%`,
        threshold: userBudget.alertAt,
      });
    }
  }

  // If we got here, budget check passed
  const totalSpend = await getCurrentSpend(orgId, userId, monthStart, monthEnd);
  const limit = Number(userBudget?.monthlyLimit || orgBudget?.monthlyLimit || 0);

  return {
    allowed: true,
    currentSpend: totalSpend,
    limit,
    remaining: limit - totalSpend,
    percentUsed: limit > 0 ? (totalSpend / limit) * 100 : 0,
  };
}

/**
 * Get current month's spend for org or user
 */
async function getCurrentSpend(
  orgId: string,
  userId: string | null,
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Get LLM usage costs
  const usageWhere: Prisma.UsageRecordWhereInput = {
    orgId,
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    usageWhere.userId = userId;
  }

  const usageResult = await prisma.usageRecord.aggregate({
    where: usageWhere,
    _sum: {
      cost: true,
    },
  });

  // Get purchase costs
  const purchaseWhere: Prisma.PurchaseRecordWhereInput = {
    orgId,
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    purchaseWhere.userId = userId;
  }

  const purchaseResult = await prisma.purchaseRecord.aggregate({
    where: purchaseWhere,
    _sum: {
      amount: true,
    },
  });

  const usageCost = Number(usageResult._sum.cost || 0);
  const purchaseCost = Number(purchaseResult._sum.amount || 0);

  return usageCost + purchaseCost;
}

/**
 * Record usage after AI call completes
 */
export async function recordUsage(params: {
  userId: string;
  orgId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  costType: string;
  tool?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  apiKeyId?: string;
}): Promise<void> {
  await prisma.usageRecord.create({
    data: {
      ...params,
      metadata: params.metadata || {},
    },
  });

  // Emit WebSocket event for real-time dashboard update
  // This will be handled by your WebSocket service
  await emitUsageEvent({
    orgId: params.orgId,
    userId: params.userId,
    cost: params.cost,
    provider: params.provider,
    model: params.model,
  });
}

/**
 * Record purchase after tool makes a purchase
 */
export async function recordPurchase(params: {
  userId: string;
  orgId: string;
  tool: string;
  amount: number;
  currency?: string;
  description?: string;
  vendor?: string;
  category?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  apiKeyId?: string;
}): Promise<void> {
  await prisma.purchaseRecord.create({
    data: {
      ...params,
      metadata: params.metadata || {},
    },
  });

  // Emit WebSocket event for real-time dashboard update
  await emitUsageEvent({
    orgId: params.orgId,
    userId: params.userId,
    cost: params.amount,
    provider: 'purchase',
    model: params.tool,
  });
}

/**
 * Create budget alert
 */
async function createBudgetAlert(params: {
  orgId: string;
  userId: string | null;
  type: string;
  message: string;
  threshold?: Prisma.Decimal;
}): Promise<void> {
  // Check if alert already exists for this period to avoid spam
  const existingAlert = await prisma.budgetAlert.findFirst({
    where: {
      orgId: params.orgId,
      userId: params.userId,
      type: params.type,
      createdAt: {
        gte: startOfMonth(new Date()),
      },
    },
  });

  if (existingAlert) return; // Don't create duplicate alerts

  await prisma.budgetAlert.create({
    data: params,
  });
}

/**
 * Emit usage event to WebSocket for real-time updates
 */
async function emitUsageEvent(data: {
  orgId: string;
  userId: string;
  cost: number;
  provider: string;
  model: string;
}): Promise<void> {
  try {
    // Use the existing WebSocket service URL
    const websocketUrl = process.env.WEBSOCKET_URL || 'ws://localhost:3003';
    const ws = new (await import('ws')).WebSocket(`${websocketUrl}/ws`);
    
    ws.on('open', () => {
      // Send usage event
      ws.send(JSON.stringify({
        type: 'USAGE_UPDATE',
        channel: `org:${data.orgId}:usage`,
        schema: 'usage.v1',
        idempotencyKey: `usage-${Date.now()}-${data.orgId}`,
        data: {
          orgId: data.orgId,
          userId: data.userId,
          cost: data.cost,
          provider: data.provider,
          model: data.model,
          timestamp: new Date().toISOString(),
        },
      }));
      
      ws.close();
    });
    
    ws.on('error', (error: Error) => {
      console.error('WebSocket error emitting usage event:', error);
    });
  } catch (error) {
    console.error('Failed to emit usage event:', error);
  }
}

/**
 * Get budget status without checking (for dashboard display)
 */
export async function getBudgetStatus(orgId: string, userId?: string): Promise<BudgetStatus> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const budget = userId
    ? await prisma.budgetLimit.findFirst({ where: { orgId, userId, isActive: true } })
    : await prisma.budgetLimit.findFirst({ where: { orgId, userId: null, isActive: true } });

  if (!budget) {
    return {
      allowed: true,
      currentSpend: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
    };
  }

  const currentSpend = await getCurrentSpend(orgId, userId || null, monthStart, monthEnd);
  const limit = Number(budget.monthlyLimit);

  return {
    allowed: currentSpend < limit,
    currentSpend,
    limit,
    remaining: limit - currentSpend,
    percentUsed: (currentSpend / limit) * 100,
  };
}

/**
 * Get budget alerts for an organization or user
 */
export async function getBudgetAlerts(orgId: string, userId?: string, unreadOnly = false) {
  const where: Prisma.BudgetAlertWhereInput = {
    orgId,
  };

  if (userId) {
    where.userId = userId;
  }

  if (unreadOnly) {
    where.isRead = false;
  }

  return await prisma.budgetAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to last 50 alerts
  });
}

/**
 * Mark budget alert as read
 */
export async function markBudgetAlertAsRead(alertId: string): Promise<void> {
  await prisma.budgetAlert.update({
    where: { id: alertId },
    data: { isRead: true },
  });
}

/**
 * Get usage records for an organization or user
 */
export async function getUsageRecords(
  orgId: string,
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  limit = 100
) {
  const where: Prisma.UsageRecordWhereInput = {
    orgId,
  };

  if (userId) {
    where.userId = userId;
  }

  if (startDate && endDate) {
    where.timestamp = {
      gte: startDate,
      lte: endDate,
    };
  }

  return await prisma.usageRecord.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
