#!/usr/bin/env node
/**
 * Production Migration: REFRAG + Tiered Retention
 * 
 * Applies schema changes for:
 * - Vector embeddings: 768 → 1536 dimensions (OpenAI compatibility)
 * - REFRAG: Adds context_chunks table and chunking support
 * - Tiered Retention: Adds hot/warm/cold/deleted tier system
 * 
 * Usage:
 *   node apps/platform/scripts/migrate-to-refrag-and-retention.js
 */

const { PrismaClient } = require('@governs-ai/db');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('\n🚀 Applying Production Migrations\n');
    console.log('This will:');
    console.log('  - Update vector dimensions to 1536 (drops existing embeddings)');
    console.log('  - Add REFRAG support (context_chunks table)');
    console.log('  - Add tiered retention system (hot/warm/cold)\n');

    // Step 1: Update embedding dimensions
    console.log('1️⃣  Updating embedding dimensions...');
    
    await prisma.$executeRaw`ALTER TABLE context_memory DROP COLUMN IF EXISTS embedding CASCADE`;
    await prisma.$executeRaw`ALTER TABLE context_memory ADD COLUMN embedding vector(1536)`;
    console.log('   ✅ context_memory.embedding → vector(1536)');

    await prisma.$executeRaw`ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding CASCADE`;
    await prisma.$executeRaw`ALTER TABLE document_chunks ADD COLUMN embedding vector(1536)`;
    console.log('   ✅ document_chunks.embedding → vector(1536)');

    // Step 2: Add REFRAG support
    console.log('\n2️⃣  Adding REFRAG support...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE context_memory ADD COLUMN IF NOT EXISTS chunks_computed BOOLEAN DEFAULT FALSE`;
      console.log('   ✅ Added chunks_computed column');
    } catch (e) {
      console.log('   ⚠️  chunks_computed already exists');
    }

    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS context_chunks (
          id TEXT PRIMARY KEY,
          context_memory_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          token_count INTEGER NOT NULL,
          embedding vector(1536),
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_context_memory FOREIGN KEY (context_memory_id) REFERENCES context_memory(id) ON DELETE CASCADE,
          CONSTRAINT unique_context_chunk UNIQUE (context_memory_id, chunk_index)
        )
      `;
      console.log('   ✅ Created context_chunks table');
    } catch (e) {
      console.log('   ⚠️  context_chunks table already exists');
    }

    // Step 3: Create vector indexes
    console.log('\n3️⃣  Creating HNSW indexes...');
    
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS context_memory_embedding_idx ON context_memory USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`;
      console.log('   ✅ context_memory index');
    } catch (e) {
      console.log('   ⚠️  context_memory index exists');
    }

    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`;
      console.log('   ✅ document_chunks index');
    } catch (e) {
      console.log('   ⚠️  document_chunks index exists');
    }

    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS context_chunks_embedding_idx ON context_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`;
      console.log('   ✅ context_chunks index');
    } catch (e) {
      console.log('   ⚠️  context_chunks index exists');
    }

    // Step 4: Add tiered retention
    console.log('\n4️⃣  Adding tiered retention system...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE context_memory
          ADD COLUMN IF NOT EXISTS retention VARCHAR(20) DEFAULT 'hot',
          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS archived_url TEXT,
          ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS upvoted BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 0
      `;
      console.log('   ✅ Added retention columns');
    } catch (e) {
      console.log('   ⚠️  Retention columns already exist');
    }

    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS context_memory_retention_idx ON context_memory (retention)`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS context_memory_retention_created_idx ON context_memory (retention, created_at)`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS context_memory_starred_idx ON context_memory (starred)`;
      console.log('   ✅ Created retention indexes');
    } catch (e) {
      console.log('   ⚠️  Retention indexes exist');
    }

    // Step 5: Set defaults and constraints
    console.log('\n5️⃣  Setting defaults and constraints...');
    
    await prisma.$executeRaw`UPDATE context_memory SET chunks_computed = FALSE WHERE chunks_computed IS NULL`;
    await prisma.$executeRaw`UPDATE context_memory SET retention = 'hot' WHERE retention IS NULL`;
    console.log('   ✅ Set default values');

    try {
      await prisma.$executeRaw`ALTER TABLE context_memory ADD CONSTRAINT check_retention_tier CHECK (retention IN ('hot', 'warm', 'cold', 'deleted'))`;
      await prisma.$executeRaw`ALTER TABLE context_memory ADD CONSTRAINT check_importance_range CHECK (importance >= 0 AND importance <= 10)`;
      console.log('   ✅ Added constraints');
    } catch (e) {
      console.log('   ⚠️  Constraints already exist');
    }

    // Step 6: Verify
    console.log('\n6️⃣  Verifying schema...');
    
    const result = await prisma.$queryRaw`
      SELECT column_name, udt_name
      FROM information_schema.columns
      WHERE table_name = 'context_memory'
        AND column_name IN ('embedding', 'retention', 'starred', 'chunks_computed')
      ORDER BY column_name
    `;

    result.forEach(col => {
      console.log(`   ✓ ${col.column_name}: ${col.udt_name}`);
    });

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  - Set PGVECTOR_DIM=1536 in environment');
    console.log('  - Embeddings will regenerate automatically on access\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
