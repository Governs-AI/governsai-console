-- Add absolute token savings and keep percent separate
ALTER TABLE refrag_analytics
  RENAME COLUMN token_savings TO token_savings_percent;

ALTER TABLE refrag_analytics
  ADD COLUMN token_savings INTEGER NOT NULL DEFAULT 0;
