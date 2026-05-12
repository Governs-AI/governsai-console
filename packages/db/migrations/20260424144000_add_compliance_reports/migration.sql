CREATE TABLE "compliance_reports" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "requested_by_id" TEXT,
    "report_type" TEXT NOT NULL DEFAULT 'compliance_summary',
    "source" TEXT NOT NULL DEFAULT 'on_demand',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "report_json" JSONB,
    "pdf_data" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "compliance_reports_org_id_created_at_idx"
ON "compliance_reports"("org_id", "created_at" DESC);

CREATE INDEX "compliance_reports_status_created_at_idx"
ON "compliance_reports"("status", "created_at" DESC);

CREATE INDEX "compliance_reports_requested_by_id_created_at_idx"
ON "compliance_reports"("requested_by_id", "created_at" DESC);

ALTER TABLE "compliance_reports"
ADD CONSTRAINT "compliance_reports_org_id_fkey"
FOREIGN KEY ("org_id") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_reports"
ADD CONSTRAINT "compliance_reports_requested_by_id_fkey"
FOREIGN KEY ("requested_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
