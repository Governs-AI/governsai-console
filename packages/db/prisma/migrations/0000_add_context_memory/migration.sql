-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetEnabled" BOOLEAN NOT NULL DEFAULT true,
    "budgetOnError" TEXT NOT NULL DEFAULT 'block',

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetToken" TEXT,
    "resetTokenExp" TIMESTAMP(3),

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMembership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "orgId" TEXT,
    "role" "OrgRole",
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaTotp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretBase32" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaTotp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkeys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "device_name" TEXT NOT NULL DEFAULT 'Unnamed Device',
    "aaguid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_confirmations" (
    "id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "request_desc" TEXT NOT NULL,
    "request_payload" JSONB NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'confirm',
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "challenge" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "consumed_at" TIMESTAMP(3),
    "passkey_id" TEXT,
    "confirmation_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "keyHash" TEXT,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "env" TEXT NOT NULL DEFAULT 'prod',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "ipAllow" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "APIKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkAccessRule" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkAccessRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cost" DECIMAL(10,6) NOT NULL,
    "cost_type" TEXT NOT NULL DEFAULT 'external',
    "tool" TEXT,
    "correlation_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "api_key_id" TEXT,
    "provider_id" TEXT,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "usedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLimit" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(10,2) NOT NULL,
    "alert_at" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "vendor" TEXT,
    "category" TEXT,
    "correlation_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "api_key_id" TEXT,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "threshold" DECIMAL(10,2),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'both',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "org_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "defaults" JSONB NOT NULL,
    "tool_access" JSONB NOT NULL DEFAULT '{}',
    "deny_tools" JSONB NOT NULL DEFAULT '[]',
    "allow_tools" JSONB NOT NULL DEFAULT '[]',
    "network_scopes" JSONB NOT NULL DEFAULT '[]',
    "network_tools" JSONB NOT NULL DEFAULT '[]',
    "on_error" TEXT NOT NULL DEFAULT 'block',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolConfig" (
    "id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "display_name" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'both',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "tool" TEXT,
    "scope" TEXT,
    "detector_summary" JSONB NOT NULL DEFAULT '{}',
    "payload_hash" TEXT NOT NULL,
    "payload_out" JSONB,
    "reasons" JSONB DEFAULT '[]',
    "policy_id" TEXT,
    "latency_ms" INTEGER,
    "correlation_id" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSocketGateway" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSocketGateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSocketChannel" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "user_id" TEXT,
    "key_id" TEXT,
    "channelType" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSocketChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSocketSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "org_id" TEXT,
    "sessionId" TEXT NOT NULL,
    "gatewayId" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "cursor" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSocketSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_memory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "agent_id" TEXT,
    "agent_name" TEXT,
    "embedding" vector(1536),
    "conversation_id" TEXT,
    "parent_id" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "pii_detected" BOOLEAN NOT NULL DEFAULT false,
    "pii_redacted" BOOLEAN NOT NULL DEFAULT false,
    "raw_content" TEXT,
    "precheck_decision" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'user',
    "visibility" TEXT NOT NULL DEFAULT 'private',

    CONSTRAINT "context_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "agent_id" TEXT,
    "agent_name" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'user',

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_hash" TEXT NOT NULL,
    "storage_url" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "scope" TEXT NOT NULL DEFAULT 'org',
    "visibility" TEXT NOT NULL DEFAULT 'org',
    "pii_detected" BOOLEAN NOT NULL DEFAULT false,
    "pii_redacted" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "pii_detected" BOOLEAN NOT NULL DEFAULT false,
    "pii_redacted" BOOLEAN NOT NULL DEFAULT false,
    "raw_content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_access_log" (
    "id" TEXT NOT NULL,
    "context_id" TEXT,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "access_type" TEXT NOT NULL,
    "query" TEXT,
    "results_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_name_key" ON "Org"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Org_slug_key" ON "Org"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_userId_key" ON "Credential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_resetToken_key" ON "Credential"("resetToken");

-- CreateIndex
CREATE INDEX "OrgMembership_userId_idx" ON "OrgMembership"("userId");

-- CreateIndex
CREATE INDEX "OrgMembership_orgId_role_idx" ON "OrgMembership"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMembership_orgId_userId_key" ON "OrgMembership"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_email_purpose_idx" ON "VerificationToken"("email", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "MfaTotp_userId_key" ON "MfaTotp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "passkeys_credential_id_key" ON "passkeys"("credential_id");

-- CreateIndex
CREATE INDEX "passkeys_user_id_org_id_idx" ON "passkeys"("user_id", "org_id");

-- CreateIndex
CREATE INDEX "passkeys_credential_id_idx" ON "passkeys"("credential_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_confirmations_correlation_id_key" ON "pending_confirmations"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_confirmations_challenge_key" ON "pending_confirmations"("challenge");

-- CreateIndex
CREATE UNIQUE INDEX "pending_confirmations_confirmation_token_key" ON "pending_confirmations"("confirmation_token");

-- CreateIndex
CREATE INDEX "pending_confirmations_correlation_id_idx" ON "pending_confirmations"("correlation_id");

-- CreateIndex
CREATE INDEX "pending_confirmations_user_id_status_idx" ON "pending_confirmations"("user_id", "status");

-- CreateIndex
CREATE INDEX "pending_confirmations_expires_at_idx" ON "pending_confirmations"("expires_at");

-- CreateIndex
CREATE INDEX "pending_confirmations_challenge_idx" ON "pending_confirmations"("challenge");

-- CreateIndex
CREATE INDEX "pending_confirmations_confirmation_token_idx" ON "pending_confirmations"("confirmation_token");

-- CreateIndex
CREATE UNIQUE INDEX "APIKey_key_key" ON "APIKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");

-- CreateIndex
CREATE INDEX "APIKey_key_idx" ON "APIKey"("key");

-- CreateIndex
CREATE INDEX "APIKey_keyHash_idx" ON "APIKey"("keyHash");

-- CreateIndex
CREATE INDEX "APIKey_userId_idx" ON "APIKey"("userId");

-- CreateIndex
CREATE INDEX "APIKey_org_id_idx" ON "APIKey"("org_id");

-- CreateIndex
CREATE INDEX "APIKey_isActive_idx" ON "APIKey"("isActive");

-- CreateIndex
CREATE INDEX "APIKey_lastUsed_idx" ON "APIKey"("lastUsed");

-- CreateIndex
CREATE INDEX "NetworkAccessRule_org_id_kind_isActive_idx" ON "NetworkAccessRule"("org_id", "kind", "isActive");

-- CreateIndex
CREATE INDEX "NetworkAccessRule_org_id_expiresAt_idx" ON "NetworkAccessRule"("org_id", "expiresAt");

-- CreateIndex
CREATE INDEX "NetworkAccessRule_isActive_idx" ON "NetworkAccessRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_name_key" ON "AIProvider"("name");

-- CreateIndex
CREATE INDEX "UsageRecord_org_id_timestamp_idx" ON "UsageRecord"("org_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "UsageRecord_userId_timestamp_idx" ON "UsageRecord"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "UsageRecord_provider_idx" ON "UsageRecord"("provider");

-- CreateIndex
CREATE INDEX "UsageRecord_tool_idx" ON "UsageRecord"("tool");

-- CreateIndex
CREATE INDEX "UsageRecord_correlation_id_idx" ON "UsageRecord"("correlation_id");

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE INDEX "Budget_org_id_idx" ON "Budget"("org_id");

-- CreateIndex
CREATE INDEX "BudgetLimit_org_id_idx" ON "BudgetLimit"("org_id");

-- CreateIndex
CREATE INDEX "BudgetLimit_user_id_idx" ON "BudgetLimit"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLimit_org_id_user_id_key" ON "BudgetLimit"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "PurchaseRecord_org_id_timestamp_idx" ON "PurchaseRecord"("org_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "PurchaseRecord_userId_timestamp_idx" ON "PurchaseRecord"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "PurchaseRecord_tool_idx" ON "PurchaseRecord"("tool");

-- CreateIndex
CREATE INDEX "PurchaseRecord_correlation_id_idx" ON "PurchaseRecord"("correlation_id");

-- CreateIndex
CREATE INDEX "PurchaseRecord_category_idx" ON "PurchaseRecord"("category");

-- CreateIndex
CREATE INDEX "BudgetAlert_org_id_isRead_idx" ON "BudgetAlert"("org_id", "isRead");

-- CreateIndex
CREATE INDEX "BudgetAlert_user_id_isRead_idx" ON "BudgetAlert"("user_id", "isRead");

-- CreateIndex
CREATE INDEX "Tool_org_id_idx" ON "Tool"("org_id");

-- CreateIndex
CREATE INDEX "Tool_category_idx" ON "Tool"("category");

-- CreateIndex
CREATE INDEX "Tool_risk_level_idx" ON "Tool"("risk_level");

-- CreateIndex
CREATE INDEX "Tool_scope_idx" ON "Tool"("scope");

-- CreateIndex
CREATE INDEX "Tool_isActive_idx" ON "Tool"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_org_id_name_key" ON "Tool"("org_id", "name");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_org_id_createdAt_idx" ON "AuditLog"("org_id", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Policy_org_id_idx" ON "Policy"("org_id");

-- CreateIndex
CREATE INDEX "Policy_user_id_idx" ON "Policy"("user_id");

-- CreateIndex
CREATE INDEX "Policy_org_id_isActive_idx" ON "Policy"("org_id", "isActive");

-- CreateIndex
CREATE INDEX "Policy_org_id_user_id_isActive_idx" ON "Policy"("org_id", "user_id", "isActive");

-- CreateIndex
CREATE INDEX "Policy_priority_idx" ON "Policy"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "ToolConfig_tool_name_key" ON "ToolConfig"("tool_name");

-- CreateIndex
CREATE INDEX "ToolConfig_category_idx" ON "ToolConfig"("category");

-- CreateIndex
CREATE INDEX "ToolConfig_risk_level_idx" ON "ToolConfig"("risk_level");

-- CreateIndex
CREATE INDEX "ToolConfig_scope_idx" ON "ToolConfig"("scope");

-- CreateIndex
CREATE INDEX "ToolConfig_isActive_idx" ON "ToolConfig"("isActive");

-- CreateIndex
CREATE INDEX "Decision_org_id_ts_idx" ON "Decision"("org_id", "ts" DESC);

-- CreateIndex
CREATE INDEX "Decision_decision_idx" ON "Decision"("decision");

-- CreateIndex
CREATE INDEX "Decision_direction_idx" ON "Decision"("direction");

-- CreateIndex
CREATE INDEX "Decision_tool_idx" ON "Decision"("tool");

-- CreateIndex
CREATE INDEX "Decision_correlation_id_idx" ON "Decision"("correlation_id");

-- CreateIndex
CREATE INDEX "Decision_policy_id_idx" ON "Decision"("policy_id");

-- CreateIndex
CREATE INDEX "WebSocketGateway_isActive_idx" ON "WebSocketGateway"("isActive");

-- CreateIndex
CREATE INDEX "WebSocketChannel_org_id_idx" ON "WebSocketChannel"("org_id");

-- CreateIndex
CREATE INDEX "WebSocketChannel_user_id_idx" ON "WebSocketChannel"("user_id");

-- CreateIndex
CREATE INDEX "WebSocketChannel_key_id_idx" ON "WebSocketChannel"("key_id");

-- CreateIndex
CREATE INDEX "WebSocketChannel_channelType_idx" ON "WebSocketChannel"("channelType");

-- CreateIndex
CREATE INDEX "WebSocketChannel_channelType_channelName_idx" ON "WebSocketChannel"("channelType", "channelName");

-- CreateIndex
CREATE INDEX "WebSocketChannel_org_id_isActive_idx" ON "WebSocketChannel"("org_id", "isActive");

-- CreateIndex
CREATE INDEX "WebSocketChannel_user_id_isActive_idx" ON "WebSocketChannel"("user_id", "isActive");

-- CreateIndex
CREATE INDEX "WebSocketChannel_key_id_isActive_idx" ON "WebSocketChannel"("key_id", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WebSocketSession_sessionId_key" ON "WebSocketSession"("sessionId");

-- CreateIndex
CREATE INDEX "WebSocketSession_userId_idx" ON "WebSocketSession"("userId");

-- CreateIndex
CREATE INDEX "WebSocketSession_org_id_idx" ON "WebSocketSession"("org_id");

-- CreateIndex
CREATE INDEX "WebSocketSession_sessionId_idx" ON "WebSocketSession"("sessionId");

-- CreateIndex
CREATE INDEX "WebSocketSession_isActive_idx" ON "WebSocketSession"("isActive");

-- CreateIndex
CREATE INDEX "WebSocketSession_lastSeen_idx" ON "WebSocketSession"("lastSeen");

-- CreateIndex
CREATE INDEX "context_memory_user_id_idx" ON "context_memory"("user_id");

-- CreateIndex
CREATE INDEX "context_memory_org_id_idx" ON "context_memory"("org_id");

-- CreateIndex
CREATE INDEX "context_memory_agent_id_idx" ON "context_memory"("agent_id");

-- CreateIndex
CREATE INDEX "context_memory_conversation_id_idx" ON "context_memory"("conversation_id");

-- CreateIndex
CREATE INDEX "context_memory_created_at_idx" ON "context_memory"("created_at" DESC);

-- CreateIndex
CREATE INDEX "context_memory_content_type_idx" ON "context_memory"("content_type");

-- CreateIndex
CREATE INDEX "context_memory_scope_visibility_idx" ON "context_memory"("scope", "visibility");

-- CreateIndex
CREATE INDEX "conversations_user_id_idx" ON "conversations"("user_id");

-- CreateIndex
CREATE INDEX "conversations_org_id_idx" ON "conversations"("org_id");

-- CreateIndex
CREATE INDEX "conversations_agent_id_idx" ON "conversations"("agent_id");

-- CreateIndex
CREATE INDEX "conversations_updated_at_idx" ON "conversations"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "documents_user_id_idx" ON "documents"("user_id");

-- CreateIndex
CREATE INDEX "documents_org_id_idx" ON "documents"("org_id");

-- CreateIndex
CREATE INDEX "documents_file_hash_idx" ON "documents"("file_hash");

-- CreateIndex
CREATE INDEX "documents_scope_visibility_idx" ON "documents"("scope", "visibility");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");

-- CreateIndex
CREATE INDEX "document_chunks_chunk_index_idx" ON "document_chunks"("chunk_index");

-- CreateIndex
CREATE INDEX "context_access_log_context_id_idx" ON "context_access_log"("context_id");

-- CreateIndex
CREATE INDEX "context_access_log_user_id_idx" ON "context_access_log"("user_id");

-- CreateIndex
CREATE INDEX "context_access_log_org_id_idx" ON "context_access_log"("org_id");

-- CreateIndex
CREATE INDEX "context_access_log_access_type_idx" ON "context_access_log"("access_type");

-- CreateIndex
CREATE INDEX "context_access_log_created_at_idx" ON "context_access_log"("created_at");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaTotp" ADD CONSTRAINT "MfaTotp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_confirmations" ADD CONSTRAINT "pending_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_confirmations" ADD CONSTRAINT "pending_confirmations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_confirmations" ADD CONSTRAINT "pending_confirmations_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "APIKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIKey" ADD CONSTRAINT "APIKey_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIKey" ADD CONSTRAINT "APIKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkAccessRule" ADD CONSTRAINT "NetworkAccessRule_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "APIKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "AIProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLimit" ADD CONSTRAINT "BudgetLimit_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLimit" ADD CONSTRAINT "BudgetLimit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "APIKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSocketChannel" ADD CONSTRAINT "WebSocketChannel_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "APIKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSocketChannel" ADD CONSTRAINT "WebSocketChannel_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSocketChannel" ADD CONSTRAINT "WebSocketChannel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSocketSession" ADD CONSTRAINT "WebSocketSession_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "WebSocketGateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSocketSession" ADD CONSTRAINT "WebSocketSession_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSocketSession" ADD CONSTRAINT "WebSocketSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_memory" ADD CONSTRAINT "context_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_memory" ADD CONSTRAINT "context_memory_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_memory" ADD CONSTRAINT "context_memory_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_memory" ADD CONSTRAINT "context_memory_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "context_memory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_access_log" ADD CONSTRAINT "context_access_log_context_id_fkey" FOREIGN KEY ("context_id") REFERENCES "context_memory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_access_log" ADD CONSTRAINT "context_access_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_access_log" ADD CONSTRAINT "context_access_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector index for context_memory.embedding (IVFFlat)
CREATE INDEX IF NOT EXISTS idx_context_memory_embedding 
ON context_memory 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create vector index for document_chunks.embedding
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Helper function for cosine similarity on context_memory
CREATE OR REPLACE FUNCTION match_context_memory(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id text DEFAULT NULL,
  filter_org_id text DEFAULT NULL,
  filter_agent_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  FROM context_memory
  WHERE 
    (filter_user_id IS NULL OR user_id = filter_user_id)
    AND (filter_org_id IS NULL OR org_id = filter_org_id)
    AND (filter_agent_id IS NULL OR agent_id = filter_agent_id)
    AND is_archived = false
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Helper function for cosine similarity on document_chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_document_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  document_id text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    document_id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 
    (filter_document_id IS NULL OR document_id = filter_document_id)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

