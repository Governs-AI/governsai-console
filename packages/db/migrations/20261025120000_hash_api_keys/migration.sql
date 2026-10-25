-- V2.12: API keys are stored as a SHA-256 hash plus a short display prefix.
-- The full key is shown once, at creation, and never stored.
--
-- Existing keys keep working: their hash is computed from the stored value,
-- then the plaintext column is dropped. sha256() is built into PostgreSQL 11+.

ALTER TABLE "APIKey" ADD COLUMN "keyPrefix" TEXT;

UPDATE "APIKey"
SET "keyHash"   = encode(sha256(convert_to("key", 'UTF8')), 'hex'),
    "keyPrefix" = left("key", 12);

ALTER TABLE "APIKey"
  ALTER COLUMN "keyHash" SET NOT NULL,
  ALTER COLUMN "keyPrefix" SET NOT NULL;

DROP INDEX IF EXISTS "APIKey_key_idx";
DROP INDEX IF EXISTS "APIKey_key_key";
ALTER TABLE "APIKey" DROP COLUMN "key";

-- precheck used to get an HMAC copy of every dashboard key in its api_keys
-- table. It now checks dashboard keys against "APIKey"."keyHash" directly, so
-- those copies are retired; left active, a key deleted or rotated here would
-- keep working in precheck. precheck's own keys (prefix GAI_) are untouched.
DO $$
BEGIN
  IF to_regclass('public.api_keys') IS NOT NULL THEN
    UPDATE api_keys
    SET is_active = false
    WHERE key_prefix LIKE 'gai\_%' OR key_prefix LIKE 'gov\_key\_%';
  END IF;
END $$;
