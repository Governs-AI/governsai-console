import { prisma } from '@governs-ai/db';

/**
 * Decision Service for processing AI governance decisions
 * 
 * Handles the processing, storage, and validation of precheck/postcheck
 * decisions received via WebSocket connections.
 */
export class DecisionService {
  constructor() {
    this.duplicateCache = new Map(); // Simple in-memory cache for recent decisions
    this.cacheMaxSize = 10000;
    this.cacheExpiryMs = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Process a decision from WebSocket INGEST message
   */
  async processDecision(decisionData) {
    try {
      const {
        orgId,
        userId,
        apiKey,
        channel,
        idempotencyKey,
        receivedAt,
        ...data
      } = decisionData;

      // Check for duplicates using idempotency key and payload hash
      const duplicateCheck = await this.checkDuplicate(orgId, data.payloadHash, data.correlationId);
      if (duplicateCheck.isDuplicate) {
        console.log(`⚠️ Duplicate decision detected: ${duplicateCheck.existingId}`);
        return {
          id: duplicateCheck.existingId,
          wasDedup: true,
          ...duplicateCheck.existingDecision
        };
      }

      // Validate decision data (ensure orgId is in data object for validation)
      const dataForValidation = { ...data, orgId };
      this.validateDecisionData(dataForValidation);

      // Create decision record
      const decision = await prisma.decision.create({
        data: {
          orgId: orgId, // Use destructured orgId
          direction: data.direction,
          decision: data.decision,
          tool: data.tool || null,
          scope: data.scope || null,
          detectorSummary: data.detectorSummary || {},
          payloadHash: data.payloadHash,
          latencyMs: data.latencyMs || null,
          correlationId: data.correlationId || null,
          tags: data.tags || [],
          ts: data.ts ? new Date(data.ts) : receivedAt || new Date()
        }
      });

      // Cache decision for duplicate detection
      this.cacheDecision(decision);

      // Log processing metrics
      await this.logDecisionMetrics(decision, { userId, apiKey, channel });

      console.log(`✅ Decision processed: ${decision.id} (${data.direction}/${data.decision})`);

      return {
        id: decision.id,
        wasDedup: false,
        orgId: decision.orgId,
        direction: decision.direction,
        decision: decision.decision,
        tool: decision.tool,
        scope: decision.scope,
        ts: decision.ts
      };

    } catch (error) {
      console.error('Decision processing error:', error);
      throw new Error(`Failed to process decision: ${error.message}`);
    }
  }

  /**
   * Check for duplicate decisions
   */
  async checkDuplicate(orgId, payloadHash, correlationId) {
    try {
      // First check in-memory cache for recent decisions
      const cacheKey = `${orgId}:${payloadHash}:${correlationId || ''}`;
      if (this.duplicateCache.has(cacheKey)) {
        const cached = this.duplicateCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiryMs) {
          return {
            isDuplicate: true,
            existingId: cached.id,
            existingDecision: cached.decision
          };
        } else {
          // Remove expired cache entry
          this.duplicateCache.delete(cacheKey);
        }
      }

      // Check database for existing decision
      const existing = await prisma.decision.findFirst({
        where: {
          orgId,
          payloadHash,
          ...(correlationId && { correlationId })
        },
        orderBy: { ts: 'desc' }
      });

      if (existing) {
        return {
          isDuplicate: true,
          existingId: existing.id,
          existingDecision: existing
        };
      }

      return { isDuplicate: false };

    } catch (error) {
      console.error('Duplicate check error:', error);
      // If duplicate check fails, allow the decision to proceed
      return { isDuplicate: false };
    }
  }

  /**
   * Cache decision for duplicate detection
   */
  cacheDecision(decision) {
    const cacheKey = `${decision.orgId}:${decision.payloadHash}:${decision.correlationId || ''}`;
    
    // Clean cache if it's getting too large
    if (this.duplicateCache.size >= this.cacheMaxSize) {
      this.cleanupCache();
    }

    this.duplicateCache.set(cacheKey, {
      id: decision.id,
      timestamp: Date.now(),
      decision
    });
  }

  /**
   * Validate decision data
   */
  validateDecisionData(data) {
    const required = ['orgId', 'direction', 'decision', 'payloadHash'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!['precheck', 'postcheck'].includes(data.direction)) {
      throw new Error(`Invalid direction: ${data.direction}`);
    }

    if (!['allow', 'transform', 'deny'].includes(data.decision)) {
      throw new Error(`Invalid decision: ${data.decision}`);
    }

    if (data.latencyMs !== undefined && (typeof data.latencyMs !== 'number' || data.latencyMs < 0)) {
      throw new Error('latencyMs must be a non-negative number');
    }

    if (!data.payloadHash.startsWith('sha256:')) {
      throw new Error('payloadHash must start with "sha256:"');
    }
  }

  /**
   * Log decision processing metrics
   */
  async logDecisionMetrics(decision, context) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: context.userId,
          orgId: decision.orgId,
          action: 'decision_processed',
          resource: 'decision',
          details: {
            decisionId: decision.id,
            direction: decision.direction,
            decision: decision.decision,
            tool: decision.tool,
            channel: context.channel,
            apiKey: context.apiKey ? context.apiKey.slice(0, 10) + '...' : null,
            latencyMs: decision.latencyMs,
            timestamp: new Date().toISOString(),
            service: 'websocket-service'
          }
        }
      });
    } catch (error) {
      console.error('Error logging decision metrics:', error);
      // Don't throw - logging failures shouldn't break decision processing
    }
  }

  /**
   * Get decision statistics for an organization
   */
  async getDecisionStats(orgId, timeRange = '24h') {
    try {
      const timeRanges = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };

      const hours = timeRanges[timeRange] || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [
        total,
        byDirection,
        byDecision,
        byTool,
        avgLatency
      ] = await Promise.all([
        // Total decisions
        prisma.decision.count({
          where: {
            orgId,
            ts: { gte: since }
          }
        }),

        // By direction (precheck/postcheck)
        prisma.decision.groupBy({
          by: ['direction'],
          where: {
            orgId,
            ts: { gte: since }
          },
          _count: true
        }),

        // By decision type (allow/transform/deny)
        prisma.decision.groupBy({
          by: ['decision'],
          where: {
            orgId,
            ts: { gte: since }
          },
          _count: true
        }),

        // By tool
        prisma.decision.groupBy({
          by: ['tool'],
          where: {
            orgId,
            ts: { gte: since },
            tool: { not: null }
          },
          _count: true,
          orderBy: {
            _count: {
              tool: 'desc'
            }
          },
          take: 10
        }),

        // Average latency
        prisma.decision.aggregate({
          where: {
            orgId,
            ts: { gte: since },
            latencyMs: { not: null }
          },
          _avg: {
            latencyMs: true
          }
        })
      ]);

      return {
        total,
        timeRange,
        since: since.toISOString(),
        byDirection: Object.fromEntries(
          byDirection.map(item => [item.direction, item._count])
        ),
        byDecision: Object.fromEntries(
          byDecision.map(item => [item.decision, item._count])
        ),
        topTools: byTool.map(item => ({
          tool: item.tool,
          count: item._count
        })),
        avgLatencyMs: avgLatency._avg.latencyMs
      };

    } catch (error) {
      console.error('Error fetching decision stats:', error);
      return null;
    }
  }

  /**
   * Get recent decisions for an organization
   */
  async getRecentDecisions(orgId, limit = 100) {
    try {
      const decisions = await prisma.decision.findMany({
        where: { orgId },
        orderBy: { ts: 'desc' },
        take: limit,
        select: {
          id: true,
          direction: true,
          decision: true,
          tool: true,
          scope: true,
          latencyMs: true,
          correlationId: true,
          tags: true,
          ts: true
        }
      });

      return decisions;
    } catch (error) {
      console.error('Error fetching recent decisions:', error);
      return [];
    }
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.duplicateCache) {
      if (now - value.timestamp > this.cacheExpiryMs) {
        this.duplicateCache.delete(key);
        cleaned++;
      }
    }

    // If still too large, remove oldest entries
    if (this.duplicateCache.size >= this.cacheMaxSize) {
      const entries = Array.from(this.duplicateCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.duplicateCache.size - this.cacheMaxSize + 1000);
      toRemove.forEach(([key]) => {
        this.duplicateCache.delete(key);
        cleaned++;
      });
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} cached decisions`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.duplicateCache.size,
      maxSize: this.cacheMaxSize,
      expiryMs: this.cacheExpiryMs,
      oldestEntry: this.duplicateCache.size > 0 ? 
        Math.min(...Array.from(this.duplicateCache.values()).map(v => v.timestamp)) : null
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    try {
      // Clear cache
      this.duplicateCache.clear();
      
      // Close database connections
      await prisma.$disconnect();
      
      console.log('✅ Decision service disconnected');
    } catch (error) {
      console.error('Decision service disconnect error:', error);
    }
  }
}
