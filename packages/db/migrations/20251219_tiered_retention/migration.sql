-- Tiered Retention Migration
-- Adds support for HOT/WARM/COLD/DELETED tiers

-- Add retention tier columns
ALTER TABLE context_memory
  ADD COLUMN IF NOT EXISTS retention VARCHAR(20) DEFAULT 'hot',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS archived_url TEXT,
  ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upvoted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 0;

-- Add indexes for efficient tier filtering
CREATE INDEX IF NOT EXISTS context_memory_retention_idx
  ON context_memory (retention);

CREATE INDEX IF NOT EXISTS context_memory_retention_created_idx
  ON context_memory (retention, created_at);

CREATE INDEX IF NOT EXISTS context_memory_starred_idx
  ON context_memory (starred);

-- Set all existing records to 'hot' tier
UPDATE context_memory SET retention = 'hot' WHERE retention IS NULL;

-- Add check constraint for valid retention values
ALTER TABLE context_memory
  ADD CONSTRAINT check_retention_tier
  CHECK (retention IN ('hot', 'warm', 'cold', 'deleted'));

-- Add check constraint for importance score
ALTER TABLE context_memory
  ADD CONSTRAINT check_importance_range
  CHECK (importance >= 0 AND importance <= 10);
