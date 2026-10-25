-- V2.17: the tool catalog is scoped per org.
--
-- org_id NULL = global entry: the built-in catalog and every entry that
-- existed before this migration. Global entries stay readable by all orgs and
-- are no longer editable through the API. An org's admins manage entries with
-- their org_id, and an org entry overrides a global one of the same name for
-- that org.
--
-- Uniqueness is per (org_id, tool_name) with NULLS NOT DISTINCT (PostgreSQL
-- 15+), so two global entries can't share a name either.

DROP INDEX IF EXISTS "ToolConfig_tool_name_key";

ALTER TABLE "ToolConfig" ADD COLUMN IF NOT EXISTS "org_id" TEXT;

CREATE INDEX IF NOT EXISTS "ToolConfig_org_id_idx" ON "ToolConfig"("org_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ToolConfig_org_id_tool_name_key"
  ON "ToolConfig"("org_id", "tool_name") NULLS NOT DISTINCT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ToolConfig_org_id_fkey') THEN
    ALTER TABLE "ToolConfig" ADD CONSTRAINT "ToolConfig_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
