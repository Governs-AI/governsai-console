/**
 * Retention & Cleanup Service
 *
 * Handles automatic cleanup of expired and old data.
 */

import { prisma } from '@governs-ai/db';
import { refragAnalytics } from './refrag-analytics';

function parseRetentionDays(value: string | undefined, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : NaN;
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

const DEFAULT_LOG_RETENTION_DAYS = parseRetentionDays(process.env.LOG_RETENTION_DAYS, 90);

export interface RetentionPolicy {
  // Context memory retention by content type (days)
  user_message?: number | null;
  agent_message?: number | null;
  tool_result?: number | null;
  decision?: number | null;
  document?: number | null;

  // Log retention (days)
  audit_log?: number | null;
  decision_log?: number | null;
  usage_record?: number | null;
  purchase_record?: number | null;
  context_access_log?: number | null;
  webhook_idempotency?: number | null;
  analytics?: number | null;

  // Conversation archival (days)
  conversation_archive?: number | null;
}

export interface CleanupResult {
  expiredContexts: number;
  oldContexts: number;
  oldAuditLogs: number;
  oldDecisionLogs: number;
  oldUsageRecords: number;
  oldPurchaseRecords: number;
  oldContextAccessLogs: number;
  oldWebhookIdempotencyKeys: number;
  orphanedChunks: number;
  oldAnalytics: number;
  archivedConversations: number;
}

export class RetentionCleanupService {
  private defaultPolicy: RetentionPolicy = {
    // Context defaults
    user_message: parseRetentionDays(process.env.RETENTION_USER_MESSAGE_DAYS, 90),
    agent_message: parseRetentionDays(process.env.RETENTION_AGENT_MESSAGE_DAYS, 90),
    tool_result: parseRetentionDays(process.env.RETENTION_TOOL_RESULT_DAYS, 30),
    decision: parseRetentionDays(process.env.RETENTION_DECISION_CONTEXT_DAYS, 365),
    document: parseRetentionDays(process.env.RETENTION_DOCUMENT_DAYS, 180),

    // Log defaults (90 days)
    audit_log: parseRetentionDays(process.env.RETENTION_AUDIT_LOG_DAYS, DEFAULT_LOG_RETENTION_DAYS),
    decision_log: parseRetentionDays(process.env.RETENTION_DECISION_LOG_DAYS, DEFAULT_LOG_RETENTION_DAYS),
    usage_record: parseRetentionDays(process.env.RETENTION_USAGE_RECORD_DAYS, DEFAULT_LOG_RETENTION_DAYS),
    purchase_record: parseRetentionDays(process.env.RETENTION_PURCHASE_RECORD_DAYS, DEFAULT_LOG_RETENTION_DAYS),
    context_access_log: parseRetentionDays(process.env.RETENTION_CONTEXT_ACCESS_LOG_DAYS, DEFAULT_LOG_RETENTION_DAYS),
    webhook_idempotency: parseRetentionDays(process.env.RETENTION_WEBHOOK_IDEMPOTENCY_DAYS, DEFAULT_LOG_RETENTION_DAYS),
    analytics: parseRetentionDays(process.env.RETENTION_ANALYTICS_DAYS, DEFAULT_LOG_RETENTION_DAYS),

    conversation_archive: parseRetentionDays(process.env.RETENTION_CONVERSATION_ARCHIVE_DAYS, 180),
  };

  /**
   * Run full cleanup process.
   *
   * @param dryRun - If true, only report what would be deleted.
   */
  async cleanup(dryRun: boolean = false): Promise<CleanupResult> {
    console.log(`🧹 Starting retention cleanup (dry run: ${dryRun})...`);

    const result: CleanupResult = {
      expiredContexts: 0,
      oldContexts: 0,
      oldAuditLogs: 0,
      oldDecisionLogs: 0,
      oldUsageRecords: 0,
      oldPurchaseRecords: 0,
      oldContextAccessLogs: 0,
      oldWebhookIdempotencyKeys: 0,
      orphanedChunks: 0,
      oldAnalytics: 0,
      archivedConversations: 0,
    };

    // 1. Delete expired contexts
    result.expiredContexts = await this.cleanupExpired(dryRun);

    // 2. Delete old contexts based on retention policy
    result.oldContexts = await this.cleanupOldContexts(dryRun);

    // 3. Delete old logs based on retention policy (default 90 days)
    const logCleanup = await this.cleanupOldLogs(dryRun);
    result.oldAuditLogs = logCleanup.oldAuditLogs;
    result.oldDecisionLogs = logCleanup.oldDecisionLogs;
    result.oldUsageRecords = logCleanup.oldUsageRecords;
    result.oldPurchaseRecords = logCleanup.oldPurchaseRecords;
    result.oldContextAccessLogs = logCleanup.oldContextAccessLogs;
    result.oldWebhookIdempotencyKeys = logCleanup.oldWebhookIdempotencyKeys;

    // 4. Delete orphaned chunks (chunks without parent context)
    result.orphanedChunks = await this.cleanupOrphanedChunks(dryRun);

    // 5. Delete old analytics
    result.oldAnalytics = await this.cleanupOldAnalytics(dryRun);

    // 6. Archive old conversations
    result.archivedConversations = await this.archiveOldConversations(dryRun);

    console.log('✅ Cleanup complete:', result);
    return result;
  }

  /**
   * Delete contexts that have passed their expiration date.
   */
  private async cleanupExpired(dryRun: boolean): Promise<number> {
    if (dryRun) {
      const count = await prisma.contextMemory.count({
        where: {
          expiresAt: {
            not: null,
            lt: new Date(),
          },
        },
      });
      console.log(`📊 Would delete ${count} expired contexts`);
      return count;
    }

    const result = await prisma.contextMemory.deleteMany({
      where: {
        expiresAt: {
          not: null,
          lt: new Date(),
        },
      },
    });

    console.log(`🗑️  Deleted ${result.count} expired contexts`);
    return result.count;
  }

  /**
   * Delete old contexts based on retention policy.
   */
  private async cleanupOldContexts(dryRun: boolean): Promise<number> {
    let totalDeleted = 0;

    const contentPolicies: Array<{ contentType: string; days: number | null | undefined }> = [
      { contentType: 'user_message', days: this.defaultPolicy.user_message },
      { contentType: 'agent_message', days: this.defaultPolicy.agent_message },
      { contentType: 'tool_result', days: this.defaultPolicy.tool_result },
      { contentType: 'decision', days: this.defaultPolicy.decision },
      { contentType: 'document', days: this.defaultPolicy.document },
    ];

    for (const { contentType, days } of contentPolicies) {
      if (days === null || days === undefined) {
        continue;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      if (dryRun) {
        const count = await prisma.contextMemory.count({
          where: {
            contentType,
            createdAt: { lt: cutoffDate },
            expiresAt: null,
          },
        });
        console.log(`📊 Would delete ${count} old ${contentType} contexts (older than ${days} days)`);
        totalDeleted += count;
      } else {
        const result = await prisma.contextMemory.deleteMany({
          where: {
            contentType,
            createdAt: { lt: cutoffDate },
            expiresAt: null,
          },
        });
        console.log(`🗑️  Deleted ${result.count} old ${contentType} contexts (older than ${days} days)`);
        totalDeleted += result.count;
      }
    }

    return totalDeleted;
  }

  /**
   * Delete old audit and event logs (configurable, default 90 days).
   */
  private async cleanupOldLogs(dryRun: boolean): Promise<Pick<CleanupResult,
    'oldAuditLogs' |
    'oldDecisionLogs' |
    'oldUsageRecords' |
    'oldPurchaseRecords' |
    'oldContextAccessLogs' |
    'oldWebhookIdempotencyKeys'
  >> {
    const result = {
      oldAuditLogs: 0,
      oldDecisionLogs: 0,
      oldUsageRecords: 0,
      oldPurchaseRecords: 0,
      oldContextAccessLogs: 0,
      oldWebhookIdempotencyKeys: 0,
    };

    result.oldAuditLogs = await this.cleanupAuditLogs(this.defaultPolicy.audit_log, dryRun);
    result.oldDecisionLogs = await this.cleanupDecisionLogs(this.defaultPolicy.decision_log, dryRun);
    result.oldUsageRecords = await this.cleanupUsageRecords(this.defaultPolicy.usage_record, dryRun);
    result.oldPurchaseRecords = await this.cleanupPurchaseRecords(this.defaultPolicy.purchase_record, dryRun);
    result.oldContextAccessLogs = await this.cleanupContextAccessLogs(this.defaultPolicy.context_access_log, dryRun);
    result.oldWebhookIdempotencyKeys = await this.cleanupWebhookIdempotency(this.defaultPolicy.webhook_idempotency, dryRun);

    return result;
  }

  private async cleanupAuditLogs(days: number | null | undefined, dryRun: boolean): Promise<number> {
    if (days === null || days === undefined) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (dryRun) {
      const count = await prisma.auditLog.count({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });
      console.log(`📊 Would delete ${count} audit logs (older than ${days} days)`);
      return count;
    }

    const deleted = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    console.log(`🗑️  Deleted ${deleted.count} audit logs (older than ${days} days)`);
    return deleted.count;
  }

  private async cleanupDecisionLogs(days: number | null | undefined, dryRun: boolean): Promise<number> {
    if (days === null || days === undefined) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (dryRun) {
      const count = await prisma.decision.count({
        where: {
          ts: { lt: cutoffDate },
        },
      });
      console.log(`📊 Would delete ${count} decision logs (older than ${days} days)`);
      return count;
    }

    const deleted = await prisma.decision.deleteMany({
      where: {
        ts: { lt: cutoffDate },
      },
    });
    console.log(`🗑️  Deleted ${deleted.count} decision logs (older than ${days} days)`);
    return deleted.count;
  }

  private async cleanupUsageRecords(days: number | null | undefined, dryRun: boolean): Promise<number> {
    if (days === null || days === undefined) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (dryRun) {
      const count = await prisma.usageRecord.count({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });
      console.log(`📊 Would delete ${count} usage records (older than ${days} days)`);
      return count;
    }

    const deleted = await prisma.usageRecord.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });
    console.log(`🗑️  Deleted ${deleted.count} usage records (older than ${days} days)`);
    return deleted.count;
  }

  private async cleanupPurchaseRecords(days: number | null | undefined, dryRun: boolean): Promise<number> {
    if (days === null || days === undefined) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (dryRun) {
      const count = await prisma.purchaseRecord.count({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });
      console.log(`📊 Would delete ${count} purchase records (older than ${days} days)`);
      return count;
    }

    const deleted = await prisma.purchaseRecord.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });
    console.log(`🗑️  Deleted ${deleted.count} purchase records (older than ${days} days)`);
    return deleted.count;
  }

  private async cleanupContextAccessLogs(days: number | null | undefined, dryRun: boolean): Promise<number> {
    if (days === null || days === undefined) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (dryRun) {
      const count = await prisma.contextAccessLog.count({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });
      console.log(`📊 Would delete ${count} context access logs (older than ${days} days)`);
      return count;
    }

    const deleted = await prisma.contextAccessLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    console.log(`🗑️  Deleted ${deleted.count} context access logs (older than ${days} days)`);
    return deleted.count;
  }

  private async cleanupWebhookIdempotency(days: number | null | undefined, dryRun: boolean): Promise<number> {
    if (days === null || days === undefined) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (dryRun) {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM webhook_idempotency_keys
        WHERE created_at < ${cutoffDate}
      `;
      const count = Number(rows[0]?.count || 0);
      console.log(`📊 Would delete ${count} webhook idempotency keys (older than ${days} days)`);
      return count;
    }

    const deleted = await prisma.$executeRaw`
      DELETE FROM webhook_idempotency_keys
      WHERE created_at < ${cutoffDate}
    `;
    console.log(`🗑️  Deleted ${deleted} webhook idempotency keys (older than ${days} days)`);
    return deleted;
  }

  /**
   * Delete orphaned chunks (chunks without parent context).
   */
  private async cleanupOrphanedChunks(dryRun: boolean): Promise<number> {
    if (dryRun) {
      const orphaned = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM context_chunks cc
        LEFT JOIN context_memory cm ON cc.context_memory_id = cm.id
        WHERE cm.id IS NULL
      `;
      const count = Number(orphaned[0]?.count || 0);
      console.log(`📊 Would delete ${count} orphaned chunks`);
      return count;
    }

    const result = await prisma.$executeRaw`
      DELETE FROM context_chunks
      WHERE context_memory_id NOT IN (
        SELECT id FROM context_memory
      )
    `;

    console.log(`🗑️  Deleted ${result} orphaned chunks`);
    return result;
  }

  /**
   * Delete old analytics data.
   */
  private async cleanupOldAnalytics(dryRun: boolean): Promise<number> {
    const days = this.defaultPolicy.analytics;
    if (days === null || days === undefined) {
      return 0;
    }

    if (dryRun) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const count = await prisma.refragAnalytics.count({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });
      console.log(`📊 Would delete ${count} old analytics records (older than ${days} days)`);
      return count;
    }

    const count = await refragAnalytics.cleanup(days);
    return count;
  }

  /**
   * Archive old conversations (soft delete).
   */
  private async archiveOldConversations(dryRun: boolean): Promise<number> {
    const days = this.defaultPolicy.conversation_archive;
    if (days === null || days === undefined) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    if (dryRun) {
      const count = await prisma.conversation.count({
        where: {
          lastMessageAt: { lt: cutoffDate },
          isArchived: false,
        },
      });
      console.log(`📊 Would archive ${count} old conversations (older than ${days} days)`);
      return count;
    }

    const result = await prisma.conversation.updateMany({
      where: {
        lastMessageAt: { lt: cutoffDate },
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });

    console.log(`📦 Archived ${result.count} old conversations (older than ${days} days)`);
    return result.count;
  }

  /**
   * Set custom retention policy.
   */
  setRetentionPolicy(policy: RetentionPolicy): void {
    this.defaultPolicy = { ...this.defaultPolicy, ...policy };
    console.log('📋 Updated retention policy:', this.defaultPolicy);
  }

  /**
   * Get current retention policy.
   */
  getRetentionPolicy(): RetentionPolicy {
    return { ...this.defaultPolicy };
  }

  /**
   * Get cleanup statistics without deleting anything.
   */
  async getCleanupStats(): Promise<CleanupResult> {
    return this.cleanup(true);
  }
}

/**
 * Singleton instance.
 */
export const retentionCleanup = new RetentionCleanupService();
