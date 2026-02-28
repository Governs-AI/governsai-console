#!/usr/bin/env tsx
/**
 * Manual Data Cleanup Script
 *
 * Run retention cleanup manually
 *
 * Usage:
 *   # Dry run (see what would be deleted)
 *   npx tsx apps/platform/scripts/cleanup-data.ts --dry-run
 *
 *   # Actually delete data
 *   npx tsx apps/platform/scripts/cleanup-data.ts
 *
 *   # Custom retention policy
 *   npx tsx apps/platform/scripts/cleanup-data.ts --user-messages=30 --tool-results=7 --log-days=90
 */

import { retentionCleanup } from '../lib/services/retention-cleanup';
import { prisma } from '@governs-ai/db';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🧹 Data Cleanup Script\n');
  console.log('='.repeat(60));

  // Parse custom retention settings
  const customPolicy: any = {};
  for (const arg of args) {
    if (arg.startsWith('--user-messages=')) {
      customPolicy.user_message = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--agent-messages=')) {
      customPolicy.agent_message = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--tool-results=')) {
      customPolicy.tool_result = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--decisions=')) {
      customPolicy.decision = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--documents=')) {
      customPolicy.document = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--log-days=')) {
      const days = parseInt(arg.split('=')[1]);
      customPolicy.audit_log = days;
      customPolicy.decision_log = days;
      customPolicy.usage_record = days;
      customPolicy.purchase_record = days;
      customPolicy.context_access_log = days;
      customPolicy.webhook_idempotency = days;
      customPolicy.analytics = days;
    }
    if (arg.startsWith('--audit-logs=')) {
      customPolicy.audit_log = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--decision-logs=')) {
      customPolicy.decision_log = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--usage-records=')) {
      customPolicy.usage_record = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--purchase-records=')) {
      customPolicy.purchase_record = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--access-logs=')) {
      customPolicy.context_access_log = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--webhook-keys=')) {
      customPolicy.webhook_idempotency = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--analytics=')) {
      customPolicy.analytics = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--conversation-archive=')) {
      customPolicy.conversation_archive = parseInt(arg.split('=')[1]);
    }
  }

  if (Object.keys(customPolicy).length > 0) {
    console.log('\n📋 Using custom retention policy:');
    console.log(customPolicy);
    retentionCleanup.setRetentionPolicy(customPolicy);
  } else {
    console.log('\n📋 Using default retention policy:');
    console.log(retentionCleanup.getRetentionPolicy());
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No data will be deleted\n');
  } else {
    console.log('\n❗ LIVE MODE - Data will be permanently deleted!\n');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Run cleanup
  const result = await retentionCleanup.cleanup(dryRun);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Cleanup Summary\n');

  const total =
    result.expiredContexts +
    result.oldContexts +
    result.oldAuditLogs +
    result.oldDecisionLogs +
    result.oldUsageRecords +
    result.oldPurchaseRecords +
    result.oldContextAccessLogs +
    result.oldWebhookIdempotencyKeys +
    result.orphanedChunks +
    result.oldAnalytics +
    result.archivedConversations;

  console.log(`Expired Contexts:      ${result.expiredContexts.toLocaleString()}`);
  console.log(`Old Contexts:          ${result.oldContexts.toLocaleString()}`);
  console.log(`Old Audit Logs:        ${result.oldAuditLogs.toLocaleString()}`);
  console.log(`Old Decision Logs:     ${result.oldDecisionLogs.toLocaleString()}`);
  console.log(`Old Usage Records:     ${result.oldUsageRecords.toLocaleString()}`);
  console.log(`Old Purchase Records:  ${result.oldPurchaseRecords.toLocaleString()}`);
  console.log(`Old Access Logs:       ${result.oldContextAccessLogs.toLocaleString()}`);
  console.log(`Old Webhook Keys:      ${result.oldWebhookIdempotencyKeys.toLocaleString()}`);
  console.log(`Orphaned Chunks:       ${result.orphanedChunks.toLocaleString()}`);
  console.log(`Old Analytics:         ${result.oldAnalytics.toLocaleString()}`);
  console.log(`Archived Conversations: ${result.archivedConversations.toLocaleString()}`);
  console.log(`${'─'.repeat(30)}`);
  console.log(`Total Items:           ${total.toLocaleString()}`);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to actually delete data\n');
  } else {
    console.log('\n✅ Cleanup complete!\n');
  }

  // Database stats
  console.log('='.repeat(60));
  console.log('\n💾 Current Database Stats\n');

  const stats = await Promise.all([
    prisma.contextMemory.count(),
    prisma.contextChunk.count(),
    prisma.refragAnalytics.count(),
    prisma.conversation.count(),
    prisma.conversation.count({ where: { isArchived: true } }),
  ]);

  console.log(`Context Memories:      ${stats[0].toLocaleString()}`);
  console.log(`Context Chunks:        ${stats[1].toLocaleString()}`);
  console.log(`Analytics Records:     ${stats[2].toLocaleString()}`);
  console.log(`Conversations (total): ${stats[3].toLocaleString()}`);
  console.log(`Conversations (archived): ${stats[4].toLocaleString()}`);

  console.log('\n' + '='.repeat(60) + '\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Cleanup script failed:', error);
  process.exit(1);
});
