#!/usr/bin/env tsx
/**
 * Tier Transition Script
 *
 * Manually run tier transitions (HOT → WARM → COLD → DELETED)
 *
 * Usage:
 *   # Dry run (see what would happen)
 *   npx tsx apps/platform/scripts/tier-transition.ts --dry-run
 *
 *   # Actually transition data
 *   npx tsx apps/platform/scripts/tier-transition.ts
 *
 *   # Get statistics
 *   npx tsx apps/platform/scripts/tier-transition.ts --stats
 */

import { tieredRetention } from '../lib/services/tiered-retention';
import { prisma } from '@governs-ai/db';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const statsOnly = args.includes('--stats');

  console.log('\n🔄 Tier Transition Script\n');
  console.log('='.repeat(60));

  // Show current stats
  console.log('\n📊 Current Tier Distribution\n');

  const stats = await tieredRetention.getTierStats();

  console.log(`HOT (0-30 days):     ${stats.hot.count.toLocaleString()} contexts`);
  console.log(`WARM (30-90 days):   ${stats.warm.count.toLocaleString()} contexts`);
  console.log(`COLD (90-365 days):  ${stats.cold.count.toLocaleString()} contexts`);
  console.log(`DELETED (365+ days): ${stats.deleted.count.toLocaleString()} contexts`);

  const total = stats.hot.count + stats.warm.count + stats.cold.count + stats.deleted.count;
  console.log(`${'─'.repeat(40)}`);
  console.log(`Total:               ${total.toLocaleString()} contexts`);

  // Show savings estimate
  const savings = await tieredRetention.estimateSavings();

  console.log('\n💰 Cost Savings\n');
  console.log(`Chunk embeddings deleted:  ${savings.chunksDeleted.toLocaleString()}`);
  console.log(`Full embeddings cleared:   ${savings.embeddingsCleared.toLocaleString()}`);
  console.log(`Space saved:               ${savings.estimatedSavingsMB} MB`);
  console.log(`Estimated monthly savings: ${savings.estimatedCostSavings}`);

  if (statsOnly) {
    console.log('\n✅ Statistics complete\n');
    await prisma.$disconnect();
    return;
  }

  // Show what will happen
  console.log('\n' + '='.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No data will be modified\n');
  } else {
    console.log('\n❗ LIVE MODE - Data will be transitioned!\n');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Run transitions
  const result = await tieredRetention.applyTierTransitions(dryRun);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Transition Summary\n');

  const action = dryRun ? 'Would transition' : 'Transitioned';

  console.log(`HOT → WARM:      ${action} ${result.hotToWarm.toLocaleString()} contexts`);
  console.log(`                 ${dryRun ? 'Would delete' : 'Deleted'} chunk embeddings`);
  console.log();
  console.log(`WARM → COLD:     ${action} ${result.warmToCold.toLocaleString()} contexts`);
  console.log(`                 ${dryRun ? 'Would archive' : 'Archived'} externally (if enabled)`);
  console.log(`                 ${dryRun ? 'Would clear' : 'Cleared'} full embeddings`);
  console.log();
  console.log(`COLD → DELETED:  ${action} ${result.coldToDeleted.toLocaleString()} contexts`);
  console.log(`                 ${dryRun ? 'Would delete' : 'Deleted'} permanently`);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to actually transition data\n');
  } else {
    console.log('\n✅ Tier transitions complete!\n');
  }

  // Show updated stats
  if (!dryRun) {
    console.log('='.repeat(60));
    console.log('\n📊 Updated Tier Distribution\n');

    const newStats = await tieredRetention.getTierStats();

    console.log(`HOT:     ${newStats.hot.count.toLocaleString()} contexts`);
    console.log(`WARM:    ${newStats.warm.count.toLocaleString()} contexts`);
    console.log(`COLD:    ${newStats.cold.count.toLocaleString()} contexts`);
    console.log(`DELETED: ${newStats.deleted.count.toLocaleString()} contexts`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Tier transition failed:', error);
  process.exit(1);
});
