-- Catch-up: objects that are in schema.prisma but were only ever applied with
-- `prisma db push`, never in a migration, so `prisma migrate deploy` on a
-- fresh database built an incomplete schema.
--
-- Every statement is idempotent (IF NOT EXISTS) because databases that were
-- created or topped up with `db push` already have these objects.

CREATE EXTENSION IF NOT EXISTS "vector";

-- User: identity from an external provider (webhook-created users)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "external_id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "external_source" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_external_id_key" ON "User"("external_id");

-- documents: owner in the external system
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "external_source" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "external_user_id" TEXT;
CREATE INDEX IF NOT EXISTS "documents_external_user_id_external_source_idx"
  ON "documents"("external_user_id", "external_source");

-- webhook_idempotency_keys: dedupe for inbound webhooks
CREATE TABLE IF NOT EXISTS "webhook_idempotency_keys" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_idempotency_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_idempotency_keys_idempotency_key_key"
  ON "webhook_idempotency_keys"("idempotency_key");
CREATE INDEX IF NOT EXISTS "webhook_idempotency_keys_idempotency_key_idx"
  ON "webhook_idempotency_keys"("idempotency_key");
CREATE INDEX IF NOT EXISTS "webhook_idempotency_keys_created_at_idx"
  ON "webhook_idempotency_keys"("created_at");
