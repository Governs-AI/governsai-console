-- CreateEnum
CREATE TYPE "KeycloakSyncStatus" AS ENUM ('HEALTHY', 'DEGRADED');

-- CreateEnum
CREATE TYPE "KeycloakSyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "keycloak_sync_state" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "KeycloakSyncStatus" NOT NULL DEFAULT 'DEGRADED',
    "last_synced_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keycloak_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keycloak_sync_jobs" (
    "id" TEXT NOT NULL,
    "status" "KeycloakSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "org_id" TEXT NOT NULL,
    "org_slug" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "encrypted_password" BYTEA,
    "password_expires_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keycloak_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "keycloak_sync_state_user_id_key" ON "keycloak_sync_state"("user_id");

-- CreateIndex
CREATE INDEX "keycloak_sync_state_status_idx" ON "keycloak_sync_state"("status");

-- CreateIndex
CREATE INDEX "keycloak_sync_state_next_retry_at_idx" ON "keycloak_sync_state"("next_retry_at");

-- CreateIndex
CREATE INDEX "keycloak_sync_jobs_status_next_run_at_idx" ON "keycloak_sync_jobs"("status", "next_run_at");

-- CreateIndex
CREATE INDEX "keycloak_sync_jobs_user_id_org_id_idx" ON "keycloak_sync_jobs"("user_id", "org_id");

-- AddForeignKey
ALTER TABLE "keycloak_sync_state" ADD CONSTRAINT "keycloak_sync_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keycloak_sync_jobs" ADD CONSTRAINT "keycloak_sync_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keycloak_sync_jobs" ADD CONSTRAINT "keycloak_sync_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
