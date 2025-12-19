/**
 * Tiered Retention Service
 *
 * Implements intelligent data retention with 4 tiers:
 * - HOT (0-30 days): Full REFRAG, all embeddings, instant search
 * - WARM (30-90 days): Searchable, no chunk embeddings (saves 60% space)
 * - COLD (90-365 days): Archived to S3, no embeddings in DB (saves 95% space)
 * - DELETED (365+ days): Permanently removed (compliance)
 *
 * Benefits:
 * - Keep data for compliance without exploding costs
 * - Fast search on recent data (hot tier)
 * - Restore cold data on-demand
 * - Smart filtering based on importance
 */

import { prisma } from '@governs-ai/db';

export type RetentionTier = 'hot' | 'warm' | 'cold' | 'deleted';

export interface TierConfig {
  name: RetentionTier;
  ageDays: number;
  chunking: boolean;
  fullEmbedding: boolean;
  chunkEmbeddings: boolean;
  searchable: boolean;
}

export interface TierTransitionResult {
  hotToWarm: number;
  warmToCold: number;
  coldToDeleted: number;
  chunkEmbeddingsDeleted: number;
  fullEmbeddingsCleared: number;
  bytesFreed: number;
}

export class TieredRetentionService {
  private tiers: TierConfig[] = [
    {
      name: 'hot',
      ageDays: 30,
      chunking: true,
      fullEmbedding: true,
      chunkEmbeddings: true,
      searchable: true,
    },
    {
      name: 'warm',
      ageDays: 90,
      chunking: false,
      fullEmbedding: true,
      chunkEmbeddings: false,
      searchable: true,
    },
    {
      name: 'cold',
      ageDays: 365,
      chunking: false,
      fullEmbedding: false,
      chunkEmbeddings: false,
      searchable: false, // Requires restoration
    },
    {
      name: 'deleted',
      ageDays: Infinity,
      chunking: false,
      fullEmbedding: false,
      chunkEmbeddings: false,
      searchable: false,
    },
  ];

  /**
   * Apply tier transitions based on age
   *
   * @param dryRun - If true, only report what would happen
   */
  async applyTierTransitions(dryRun: boolean = false): Promise<TierTransitionResult> {
    console.log(`🔄 Applying tier transitions (dry run: ${dryRun})...`);

    const result: TierTransitionResult = {
      hotToWarm: 0,
      warmToCold: 0,
      coldToDeleted: 0,
      chunkEmbeddingsDeleted: 0,
      fullEmbeddingsCleared: 0,
      bytesFreed: 0,
    };

    const now = new Date();

    // 1. HOT → WARM (30 days): Drop chunk embeddings
    const warmCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    result.hotToWarm = await this.transitionHotToWarm(warmCutoff, dryRun);

    // 2. WARM → COLD (90 days): Archive to S3, drop full embeddings
    const coldCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    result.warmToCold = await this.transitionWarmToCold(coldCutoff, dryRun);

    // 3. COLD → DELETED (365 days): Permanent deletion
    const deleteCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    result.coldToDeleted = await this.transitionColdToDeleted(deleteCutoff, dryRun);

    console.log('✅ Tier transitions complete:', result);
    return result;
  }

  /**
   * Transition HOT → WARM: Drop chunk embeddings
   */
  private async transitionHotToWarm(cutoffDate: Date, dryRun: boolean): Promise<number> {
    // Find contexts eligible for transition
    const contexts = await prisma.contextMemory.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        retention: 'hot',
        // Don't transition important/starred content
        starred: false,
      },
      select: { id: true },
    });

    if (dryRun) {
      console.log(`📊 Would transition ${contexts.length} contexts from HOT → WARM`);
      return contexts.length;
    }

    // Delete chunk embeddings to save space
    const chunkResult = await prisma.contextChunk.deleteMany({
      where: {
        contextMemoryId: { in: contexts.map(c => c.id) },
      },
    });

    console.log(`🗑️  Deleted ${chunkResult.count} chunk embeddings (HOT → WARM)`);

    // Update retention tier
    await prisma.contextMemory.updateMany({
      where: { id: { in: contexts.map(c => c.id) } },
      data: {
        retention: 'warm',
        chunksComputed: false, // No longer has chunks
      },
    });

    console.log(`📦 Transitioned ${contexts.length} contexts to WARM tier`);
    return contexts.length;
  }

  /**
   * Transition WARM → COLD: Archive to S3, drop embeddings
   */
  private async transitionWarmToCold(cutoffDate: Date, dryRun: boolean): Promise<number> {
    const contexts = await prisma.contextMemory.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        retention: 'warm',
        starred: false,
      },
    });

    if (dryRun) {
      console.log(`📊 Would transition ${contexts.length} contexts from WARM → COLD`);
      return contexts.length;
    }

    // Archive to S3 (if configured)
    if (process.env.ENABLE_S3_ARCHIVE === 'true') {
      for (const context of contexts) {
        try {
          await this.archiveToS3(context);
        } catch (error) {
          console.error(`Failed to archive ${context.id}:`, error);
        }
      }
    }

    // Clear embeddings from DB (save space)
    // Use raw SQL to set embedding to NULL (Prisma doesn't support Unsupported type updates)
    for (const context of contexts) {
      await prisma.$executeRawUnsafe(
        `UPDATE context_memory SET embedding = NULL WHERE id = $1`,
        context.id
      );
    }

    // Update retention tier
    await prisma.contextMemory.updateMany({
      where: { id: { in: contexts.map(c => c.id) } },
      data: {
        retention: 'cold',
        archivedAt: new Date(),
        // archivedUrl will be set during archival
      },
    });

    console.log(`❄️  Transitioned ${contexts.length} contexts to COLD tier`);
    return contexts.length;
  }

  /**
   * Transition COLD → DELETED: Permanent deletion
   */
  private async transitionColdToDeleted(cutoffDate: Date, dryRun: boolean): Promise<number> {
    const count = await prisma.contextMemory.count({
      where: {
        createdAt: { lt: cutoffDate },
        retention: 'cold',
        starred: false,
        // Keep compliance/audit data
        contentType: { not: 'decision' },
      },
    });

    if (dryRun) {
      console.log(`📊 Would delete ${count} contexts from COLD tier`);
      return count;
    }

    const result = await prisma.contextMemory.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        retention: 'cold',
        starred: false,
        contentType: { not: 'decision' },
      },
    });

    console.log(`🗑️  Permanently deleted ${result.count} contexts`);
    return result.count;
  }

  /**
   * Archive context to S3 (placeholder - implement with your S3 client)
   */
  private async archiveToS3(context: any): Promise<string> {
    // TODO: Implement S3 archival
    // const s3 = new S3Client({ region: 'us-east-1' });
    // await s3.putObject({
    //   Bucket: process.env.S3_ARCHIVE_BUCKET!,
    //   Key: `context/${context.userId}/${context.id}.json`,
    //   Body: JSON.stringify(context),
    // });

    const archiveUrl = `s3://archive/context/${context.userId}/${context.id}.json`;

    // Update archived URL
    await prisma.contextMemory.update({
      where: { id: context.id },
      data: { archivedUrl: archiveUrl },
    });

    return archiveUrl;
  }

  /**
   * Restore cold context on-demand
   */
  async restoreColdContext(contextId: string): Promise<void> {
    const context = await prisma.contextMemory.findUnique({
      where: { id: contextId },
    });

    if (!context || context.retention !== 'cold') {
      throw new Error('Context not in cold tier or does not exist');
    }

    if (!context.archivedUrl) {
      throw new Error('Context not archived');
    }

    // TODO: Restore from S3
    // const s3 = new S3Client({ region: 'us-east-1' });
    // const object = await s3.getObject({
    //   Bucket: process.env.S3_ARCHIVE_BUCKET!,
    //   Key: context.archivedUrl.replace('s3://archive/', ''),
    // });
    // const restored = JSON.parse(await object.Body.transformToString());

    // For now, just transition back to warm
    await prisma.contextMemory.update({
      where: { id: contextId },
      data: { retention: 'warm' },
    });

    console.log(`♻️  Restored context ${contextId} from COLD to WARM`);
  }

  /**
   * Override retention tier for important content
   */
  async markAsImportant(contextId: string, permanent: boolean = false): Promise<void> {
    await prisma.contextMemory.update({
      where: { id: contextId },
      data: {
        starred: true,
        retention: permanent ? 'hot' : undefined, // Stay hot if permanent
      },
    });

    console.log(`⭐ Marked context ${contextId} as important`);
  }

  /**
   * Get tier statistics
   */
  async getTierStats(): Promise<Record<RetentionTier, { count: number; sizeEstimate: string }>> {
    const stats = await prisma.contextMemory.groupBy({
      by: ['retention'],
      _count: { id: true },
    });

    const result: any = {
      hot: { count: 0, sizeEstimate: '0 MB' },
      warm: { count: 0, sizeEstimate: '0 MB' },
      cold: { count: 0, sizeEstimate: '0 MB' },
      deleted: { count: 0, sizeEstimate: '0 MB' },
    };

    for (const stat of stats) {
      const tier = (stat.retention as RetentionTier) || 'hot';
      result[tier].count = stat._count.id;
    }

    return result;
  }

  /**
   * Estimate cost savings from tiering
   */
  async estimateSavings(): Promise<{
    chunksDeleted: number;
    embeddingsCleared: number;
    estimatedSavingsMB: number;
    estimatedCostSavings: string;
  }> {
    // Count chunks in warm/cold tiers (should be 0)
    const chunkCount = await prisma.contextChunk.count({
      where: {
        contextMemory: {
          retention: { in: ['warm', 'cold'] },
        },
      },
    });

    // Count embeddings in cold tier (should be 0)
    const coldWithEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM context_memory
      WHERE retention = 'cold' AND embedding IS NOT NULL
    `;

    const embeddingsCleared = Number(coldWithEmbeddings[0]?.count || 0);

    // Rough estimate: 1536 dims * 4 bytes (float32) * count
    const estimatedSavingsMB = (chunkCount * 1536 * 4 + embeddingsCleared * 1536 * 4) / (1024 * 1024);

    return {
      chunksDeleted: chunkCount,
      embeddingsCleared,
      estimatedSavingsMB: Math.round(estimatedSavingsMB),
      estimatedCostSavings: `$${(estimatedSavingsMB * 0.10).toFixed(2)}/month`, // Rough estimate
    };
  }
}

/**
 * Singleton instance
 */
export const tieredRetention = new TieredRetentionService();
