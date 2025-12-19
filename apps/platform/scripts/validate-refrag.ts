#!/usr/bin/env tsx
/**
 * REFRAG Validation Script
 *
 * Validates that REFRAG is properly configured and working
 *
 * Usage:
 *   npx tsx apps/platform/scripts/validate-refrag.ts
 */

import { RAG_CONFIG, validateRagConfig, printConfigSummary } from '../lib/config/rag-config';
import { ChunkService } from '../lib/services/chunk-service';
import { prisma } from '@governs-ai/db';

interface ValidationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>;
}

async function validateRefrag(): Promise<void> {
  console.log('\n🔍 REFRAG Validation Script\n');
  console.log('='.repeat(60));

  const results: ValidationResult[] = [];

  // 1. Configuration Validation
  console.log('\n📋 1. Configuration Validation\n');
  const configResult: ValidationResult = {
    category: 'Configuration',
    checks: [],
  };

  const configValidation = validateRagConfig();
  if (configValidation.valid) {
    configResult.checks.push({
      name: 'RAG Config',
      status: 'pass',
      message: 'Configuration is valid',
    });
  } else {
    configResult.checks.push({
      name: 'RAG Config',
      status: 'fail',
      message: configValidation.errors.join(', '),
    });
  }

  // Check REFRAG enabled
  if (RAG_CONFIG.REFRAG.ENABLED) {
    configResult.checks.push({
      name: 'REFRAG Enabled',
      status: 'pass',
      message: 'REFRAG is enabled',
    });
  } else {
    configResult.checks.push({
      name: 'REFRAG Enabled',
      status: 'warning',
      message: 'REFRAG is disabled (set REFRAG_ENABLED=true)',
    });
  }

  // Check embedding provider
  const provider = RAG_CONFIG.EMBEDDING.DEFAULT_PROVIDER;
  configResult.checks.push({
    name: 'Embedding Provider',
    status: 'pass',
    message: `Using ${provider}`,
  });

  // Check dimension match
  const providerDim = RAG_CONFIG.EMBEDDING.DIMENSIONS[provider];
  const dbDim = RAG_CONFIG.EMBEDDING.DB_VECTOR_DIM;
  if (providerDim === dbDim) {
    configResult.checks.push({
      name: 'Dimension Match',
      status: 'pass',
      message: `Provider and DB both use ${dbDim} dimensions`,
    });
  } else {
    configResult.checks.push({
      name: 'Dimension Match',
      status: 'fail',
      message: `Mismatch: Provider=${providerDim}, DB=${dbDim}`,
    });
  }

  results.push(configResult);
  printChecks(configResult);

  // 2. Database Validation
  console.log('\n💾 2. Database Validation\n');
  const dbResult: ValidationResult = {
    category: 'Database',
    checks: [],
  };

  try {
    // Check context_chunks table exists
    const chunks = await prisma.contextChunk.findMany({ take: 1 });
    dbResult.checks.push({
      name: 'context_chunks Table',
      status: 'pass',
      message: 'Table exists and is accessible',
    });

    // Check refrag_analytics table exists
    const analytics = await prisma.refragAnalytics.findMany({ take: 1 });
    dbResult.checks.push({
      name: 'refrag_analytics Table',
      status: 'pass',
      message: 'Table exists and is accessible',
    });

    // Check chunks_computed column
    const memory = await prisma.contextMemory.findFirst({
      select: { chunksComputed: true },
    });
    dbResult.checks.push({
      name: 'chunks_computed Column',
      status: 'pass',
      message: 'Column exists in context_memory',
    });

    // Count existing chunks
    const chunkCount = await prisma.contextChunk.count();
    dbResult.checks.push({
      name: 'Existing Chunks',
      status: chunkCount > 0 ? 'pass' : 'warning',
      message: `Found ${chunkCount} chunks`,
    });
  } catch (error) {
    dbResult.checks.push({
      name: 'Database Connection',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  results.push(dbResult);
  printChecks(dbResult);

  // 3. Redis Validation
  console.log('\n🔴 3. Redis Validation\n');
  const redisResult: ValidationResult = {
    category: 'Redis',
    checks: [],
  };

  try {
    // Try to connect to Redis
    const Redis = require('ioredis');
    const redis = new Redis({
      host: RAG_CONFIG.PROCESSING.REDIS_HOST,
      port: RAG_CONFIG.PROCESSING.REDIS_PORT,
      retryStrategy: () => null, // Don't retry
      lazyConnect: true,
    });

    await redis.connect();
    const pingResult = await redis.ping();

    if (pingResult === 'PONG') {
      redisResult.checks.push({
        name: 'Redis Connection',
        status: 'pass',
        message: `Connected to ${RAG_CONFIG.PROCESSING.REDIS_HOST}:${RAG_CONFIG.PROCESSING.REDIS_PORT}`,
      });
    }

    await redis.quit();
  } catch (error) {
    redisResult.checks.push({
      name: 'Redis Connection',
      status: 'fail',
      message: `Cannot connect to Redis at ${RAG_CONFIG.PROCESSING.REDIS_HOST}:${RAG_CONFIG.PROCESSING.REDIS_PORT}`,
    });
  }

  results.push(redisResult);
  printChecks(redisResult);

  // 4. Service Validation
  console.log('\n⚙️  4. Service Validation\n');
  const serviceResult: ValidationResult = {
    category: 'Services',
    checks: [],
  };

  try {
    // Test ChunkService
    const chunkService = new ChunkService();
    const testContent = 'This is a test content for chunking validation with enough tokens to test.';
    const chunkResult = chunkService.chunkContent(testContent);

    serviceResult.checks.push({
      name: 'ChunkService',
      status: 'pass',
      message: `Created ${chunkResult.chunks.length} chunks from test content`,
    });

    // Validate chunk service config
    const chunkValidation = chunkService.validateConfig();
    if (chunkValidation.valid) {
      serviceResult.checks.push({
        name: 'ChunkService Config',
        status: 'pass',
        message: 'Configuration is valid',
      });
    } else {
      serviceResult.checks.push({
        name: 'ChunkService Config',
        status: 'fail',
        message: chunkValidation.errors.join(', '),
      });
    }
  } catch (error) {
    serviceResult.checks.push({
      name: 'ChunkService',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  results.push(serviceResult);
  printChecks(serviceResult);

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validation Summary\n');

  let totalChecks = 0;
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const result of results) {
    totalChecks += result.checks.length;
    passed += result.checks.filter(c => c.status === 'pass').length;
    failed += result.checks.filter(c => c.status === 'fail').length;
    warnings += result.checks.filter(c => c.status === 'warning').length;
  }

  console.log(`Total Checks: ${totalChecks}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0 && warnings === 0) {
    console.log('\n🎉 REFRAG is properly configured and ready to use!\n');
  } else if (failed === 0) {
    console.log('\n⚠️  REFRAG is configured but has some warnings. Review above.\n');
  } else {
    console.log('\n❌ REFRAG has configuration issues. Please fix the failed checks above.\n');
  }

  // Print configuration
  console.log('='.repeat(60));
  printConfigSummary();

  // Cleanup
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

function printChecks(result: ValidationResult): void {
  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️ ';
    console.log(`${icon} ${check.name}: ${check.message}`);
  }
}

// Run validation
validateRefrag().catch((error) => {
  console.error('❌ Validation script error:', error);
  process.exit(1);
});
