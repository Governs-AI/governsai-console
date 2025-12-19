/**
 * Tier Transition Cron Job
 *
 * Automatically transitions data through retention tiers:
 * HOT (0-30d) → WARM (30-90d) → COLD (90-365d) → DELETED (365+d)
 *
 * Runs daily to optimize storage costs while maintaining data availability
 */

import { tieredRetention } from '../services/tiered-retention';

export class TierTransitionCron {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start the tier transition cron job
   *
   * @param intervalHours - How often to run (default: 24 hours / daily)
   */
  start(intervalHours: number = 24): void {
    if (this.intervalId) {
      console.log('⚠️  Tier transition cron already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run immediately on start
    this.runTransitions();

    // Schedule recurring transitions
    this.intervalId = setInterval(() => {
      this.runTransitions();
    }, intervalMs);

    console.log(`🕐 Tier transition cron started (runs every ${intervalHours} hours)`);
  }

  /**
   * Stop the tier transition cron job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Tier transition cron stopped');
    }
  }

  /**
   * Run tier transitions now
   */
  private async runTransitions(): Promise<void> {
    if (this.isRunning) {
      console.log('⏭️  Tier transition already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('\n🔄 Starting tier transitions...');
      const result = await tieredRetention.applyTierTransitions(false);

      console.log('\n📊 Tier Transition Summary:');
      console.log(`  HOT → WARM:      ${result.hotToWarm} contexts`);
      console.log(`  WARM → COLD:     ${result.warmToCold} contexts`);
      console.log(`  COLD → DELETED:  ${result.coldToDeleted} contexts`);
      console.log(`  Chunks deleted:  ${result.chunkEmbeddingsDeleted}`);
      console.log(`  Embeddings cleared: ${result.fullEmbeddingsCleared}`);
      console.log(`  Space freed:     ${(result.bytesFreed / 1024 / 1024).toFixed(2)} MB`);

      // Get savings estimate
      const savings = await tieredRetention.estimateSavings();
      console.log(`  💰 Estimated savings: ${savings.estimatedCostSavings}`);

      console.log('✅ Tier transitions complete\n');
    } catch (error) {
      console.error('❌ Tier transition failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if cron is running
   */
  isActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Run transitions manually (one-time)
   */
  async runOnce(dryRun: boolean = false): Promise<void> {
    if (this.isRunning) {
      console.log('⏭️  Tier transition already in progress');
      return;
    }

    this.isRunning = true;

    try {
      console.log(`\n🔄 Running tier transitions (dry run: ${dryRun})...\n`);
      const result = await tieredRetention.applyTierTransitions(dryRun);

      console.log('\n📊 Results:');
      console.log(`  HOT → WARM:      ${result.hotToWarm} contexts`);
      console.log(`  WARM → COLD:     ${result.warmToCold} contexts`);
      console.log(`  COLD → DELETED:  ${result.coldToDeleted} contexts`);

      if (dryRun) {
        console.log('\n💡 Run without dryRun to actually transition data\n');
      }
    } finally {
      this.isRunning = false;
    }
  }
}

/**
 * Singleton instance
 */
export const tierTransitionCron = new TierTransitionCron();

/**
 * Helper to start tier transition cron
 */
export function startTierTransitionCron(intervalHours?: number): void {
  tierTransitionCron.start(intervalHours);
}

/**
 * Helper to stop tier transition cron
 */
export function stopTierTransitionCron(): void {
  tierTransitionCron.stop();
}
