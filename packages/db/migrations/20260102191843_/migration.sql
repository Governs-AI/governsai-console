/*
  Warnings:

  - Made the column `chunks_computed` on table `context_memory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `retention` on table `context_memory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `starred` on table `context_memory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `upvoted` on table `context_memory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `importance` on table `context_memory` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "context_chunks" DROP CONSTRAINT "fk_context_memory";

-- DropForeignKey
ALTER TABLE "refrag_analytics" DROP CONSTRAINT "fk_org";

-- DropForeignKey
ALTER TABLE "refrag_analytics" DROP CONSTRAINT "fk_user";

-- DropIndex
DROP INDEX "context_chunks_embedding_idx";

-- DropIndex
DROP INDEX "context_memory_conversation_timestamp_idx";

-- DropIndex
DROP INDEX "context_memory_embedding_idx";

-- DropIndex
DROP INDEX "context_memory_user_timestamp_idx";

-- DropIndex
DROP INDEX "document_chunks_embedding_idx";

-- AlterTable
ALTER TABLE "context_memory" ALTER COLUMN "chunks_computed" SET NOT NULL,
ALTER COLUMN "retention" SET NOT NULL,
ALTER COLUMN "retention" SET DATA TYPE TEXT,
ALTER COLUMN "starred" SET NOT NULL,
ALTER COLUMN "upvoted" SET NOT NULL,
ALTER COLUMN "importance" SET NOT NULL;

-- AlterTable
ALTER TABLE "refrag_analytics" ALTER COLUMN "token_savings" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "context_chunks" ADD CONSTRAINT "context_chunks_context_memory_id_fkey" FOREIGN KEY ("context_memory_id") REFERENCES "context_memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refrag_analytics" ADD CONSTRAINT "refrag_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refrag_analytics" ADD CONSTRAINT "refrag_analytics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "context_chunks_context_memory_idx" RENAME TO "context_chunks_context_memory_id_idx";

-- RenameIndex
ALTER INDEX "unique_context_chunk" RENAME TO "context_chunks_context_memory_id_chunk_index_key";

-- RenameIndex
ALTER INDEX "context_memory_retention_created_idx" RENAME TO "context_memory_retention_created_at_idx";

-- RenameIndex
ALTER INDEX "refrag_analytics_org_timestamp_idx" RENAME TO "refrag_analytics_org_id_timestamp_idx";

-- RenameIndex
ALTER INDEX "refrag_analytics_user_timestamp_idx" RENAME TO "refrag_analytics_user_id_timestamp_idx";
