-- REFRAG Implementation Migration
-- Fix embedding dimensions from 768 to 1536 (OpenAI)
-- Add ContextChunk table for REFRAG chunking
-- Add HNSW indexes for performance

-- ========================================
-- Step 1: Fix ContextMemory embedding dimension
-- ========================================

-- Drop existing embedding column if exists
ALTER TABLE context_memory DROP COLUMN IF EXISTS embedding;

-- Recreate with correct dimensions (1536 for OpenAI)
ALTER TABLE context_memory ADD COLUMN embedding vector(1536);

-- Add chunks_computed flag for REFRAG
ALTER TABLE context_memory ADD COLUMN IF NOT EXISTS chunks_computed BOOLEAN DEFAULT FALSE;

-- ========================================
-- Step 2: Fix DocumentChunk embedding dimension
-- ========================================

-- Drop existing embedding column if exists
ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;

-- Recreate with correct dimensions (1536 for OpenAI)
ALTER TABLE document_chunks ADD COLUMN embedding vector(1536);

-- ========================================
-- Step 3: Create ContextChunk table for REFRAG
-- ========================================

CREATE TABLE IF NOT EXISTS context_chunks (
  id TEXT PRIMARY KEY,
  context_memory_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_context_memory
    FOREIGN KEY (context_memory_id)
    REFERENCES context_memory(id)
    ON DELETE CASCADE,

  -- Unique constraint
  CONSTRAINT unique_context_chunk
    UNIQUE (context_memory_id, chunk_index)
);

-- ========================================
-- Step 4: Add HNSW indexes for vector similarity search
-- ========================================

-- HNSW index for ContextMemory (cosine distance)
-- m=16: number of bi-directional links per node
-- ef_construction=64: size of dynamic candidate list during construction
CREATE INDEX IF NOT EXISTS context_memory_embedding_idx
ON context_memory
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index for DocumentChunk
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index for ContextChunk
CREATE INDEX IF NOT EXISTS context_chunks_embedding_idx
ON context_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ========================================
-- Step 5: Add additional indexes for filtering
-- ========================================

-- Index for filtering by user and timestamp
CREATE INDEX IF NOT EXISTS context_memory_user_timestamp_idx
ON context_memory (user_id, created_at DESC);

-- Index for filtering by conversation
CREATE INDEX IF NOT EXISTS context_memory_conversation_timestamp_idx
ON context_memory (conversation_id, created_at DESC);

-- Index for ContextChunk lookups
CREATE INDEX IF NOT EXISTS context_chunks_context_memory_idx
ON context_chunks (context_memory_id);

-- Index for chunks_computed flag
CREATE INDEX IF NOT EXISTS context_memory_chunks_computed_idx
ON context_memory (chunks_computed)
WHERE chunks_computed = FALSE;

-- ========================================
-- Step 6: Add RefragAnalytics table for monitoring
-- ========================================

CREATE TABLE IF NOT EXISTS refrag_analytics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  query TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  expanded_chunks INTEGER NOT NULL,
  compressed_chunks INTEGER NOT NULL,
  token_savings DECIMAL(5,2) NOT NULL,
  latency_ms INTEGER NOT NULL,
  timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES "Org"(id) ON DELETE CASCADE
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS refrag_analytics_user_timestamp_idx
ON refrag_analytics (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS refrag_analytics_org_timestamp_idx
ON refrag_analytics (org_id, timestamp DESC);

-- ========================================
-- Migration Complete
-- ========================================

-- Note: Existing data will have NULL embeddings and needs to be regenerated
-- Set chunks_computed=false for all existing records to trigger re-chunking
UPDATE context_memory SET chunks_computed = FALSE WHERE chunks_computed IS NULL;
