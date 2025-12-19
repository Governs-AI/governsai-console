/**
 * Cleanup Cron Job
 *
 * Scheduled task to run retention cleanup automatically
 *
 * Usage:
 *   - Add to your app startup (app/layout.tsx or similar)
 *   - Or run as separate worker process
 */

import { retentionCleanup } from '../services/retention-cleanup';

export class CleanupCronJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start the cleanup cron job
   *
   * @param intervalHours - How often to run cleanup (default: 24 hours)
   */
  start(intervalHours: number = 24): void {
    if (this.intervalId) {
      console.log('⚠️  Cleanup cron already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run immediately on start
    this.runCleanup();

    // Schedule recurring cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, intervalMs);

    console.log(`🕐 Cleanup cron started (runs every ${intervalHours} hours)`);
  }

  /**
   * Stop the cleanup cron job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Cleanup cron stopped');
    }
  }

  /**
   * Run cleanup now
   */
  private async runCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log('⏭️  Cleanup already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('\n🧹 Starting scheduled cleanup...');
      const result = await retentionCleanup.cleanup(false);

      console.log('\n📊 Cleanup Summary:');
      console.log(`  - Expired contexts: ${result.expiredContexts}`);
      console.log(`  - Old contexts: ${result.oldContexts}`);
      console.log(`  - Orphaned chunks: ${result.orphanedChunks}`);
      console.log(`  - Old analytics: ${result.oldAnalytics}`);
      console.log(`  - Archived conversations: ${result.archivedConversations}`);
      console.log('✅ Cleanup complete\n');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
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
}

/**
 * Singleton instance
 */
export const cleanupCron = new CleanupCronJob();

/**
 * Helper to start cleanup cron with default settings
 */
export function startCleanupCron(intervalHours?: number): void {
  cleanupCron.start(intervalHours);
}

/**
 * Helper to stop cleanup cron
 */
export function stopCleanupCron(): void {
  cleanupCron.stop();
}
