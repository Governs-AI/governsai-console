/**
 * Retention & Cleanup Service
 *
 * Handles automatic cleanup of expired and old data
 */

import { prisma } from '@governs-ai/db';
import { refragAnalytics } from './refrag-analytics';

export interface RetentionPolicy {
  // Days to keep data (null = keep forever)
  user_message?: number | null;
  agent_message?: number | null;
  tool_result?: number | null;
  decision?: number | null;
  document?: number | null;
}

export interface CleanupResult {
  expiredContexts: number;
  oldContexts: number;
  orphanedChunks: number;
  oldAnalytics: number;
  archivedConversations: number;
}

export class RetentionCleanupService {
  private defaultPolicy: RetentionPolicy = {
    user_message: 90,      // 90 days
    agent_message: 90,     // 90 days
    tool_result: 30,       // 30 days (temporary data)
    decision: 365,         // 1 year (governance/audit)
    document: 180,         // 6 months
  };

  /**
   * Run full cleanup process
   *
   * @param dryRun - If true, only report what would be deleted
   */
  async cleanup(dryRun: boolean = false): Promise<CleanupResult> {
    console.log(`🧹 Starting retention cleanup (dry run: ${dryRun})...`);

    const result: CleanupResult = {
      expiredContexts: 0,
      oldContexts: 0,
      orphanedChunks: 0,
      oldAnalytics: 0,
      archivedConversations: 0,
    };

    // 1. Delete expired contexts
    result.expiredContexts = await this.cleanupExpired(dryRun);

    // 2. Delete old contexts based on retention policy
    result.oldContexts = await this.cleanupOldContexts(dryRun);

    // 3. Delete orphaned chunks (chunks without parent context)
    result.orphanedChunks = await this.cleanupOrphanedChunks(dryRun);

    // 4. Delete old analytics
    result.oldAnalytics = await this.cleanupOldAnalytics(90, dryRun);

    // 5. Archive old conversations
    result.archivedConversations = await this.archiveOldConversations(180, dryRun);

    console.log(`✅ Cleanup complete:`, result);
    return result;
  }

  /**
   * Delete contexts that have passed their expiration date
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
   * Delete old contexts based on retention policy
   */
  private async cleanupOldContexts(dryRun: boolean): Promise<number> {
    let totalDeleted = 0;

    for (const [contentType, retentionDays] of Object.entries(this.defaultPolicy)) {
      if (retentionDays === null) continue; // Keep forever

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      if (dryRun) {
        const count = await prisma.contextMemory.count({
          where: {
            contentType,
            createdAt: { lt: cutoffDate },
            expiresAt: null, // Only cleanup items without explicit expiry
          },
        });
        console.log(`📊 Would delete ${count} old ${contentType} (older than ${retentionDays} days)`);
        totalDeleted += count;
      } else {
        const result = await prisma.contextMemory.deleteMany({
          where: {
            contentType,
            createdAt: { lt: cutoffDate },
            expiresAt: null,
          },
        });
        console.log(`🗑️  Deleted ${result.count} old ${contentType} (older than ${retentionDays} days)`);
        totalDeleted += result.count;
      }
    }

    return totalDeleted;
  }

  /**
   * Delete orphaned chunks (chunks without parent context)
   */
  private async cleanupOrphanedChunks(dryRun: boolean): Promise<number> {
    if (dryRun) {
      const orphaned = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
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
   * Delete old analytics data
   */
  private async cleanupOldAnalytics(days: number, dryRun: boolean): Promise<number> {
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
   * Archive old conversations (soft delete)
   */
  private async archiveOldConversations(days: number, dryRun: boolean): Promise<number> {
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
   * Set custom retention policy
   */
  setRetentionPolicy(policy: RetentionPolicy): void {
    this.defaultPolicy = { ...this.defaultPolicy, ...policy };
    console.log('📋 Updated retention policy:', this.defaultPolicy);
  }

  /**
   * Get current retention policy
   */
  getRetentionPolicy(): RetentionPolicy {
    return { ...this.defaultPolicy };
  }

  /**
   * Get cleanup statistics without deleting anything
   */
  async getCleanupStats(): Promise<CleanupResult> {
    return this.cleanup(true);
  }
}

/**
 * Singleton instance
 */
export const retentionCleanup = new RetentionCleanupService();
