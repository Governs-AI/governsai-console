-- GOV-1885: compliance report hardening
--   * error_code: stable enum surfaced to clients (raw error_message stays internal)
--   * pdf_blob_url / pdf_blob_path: artifact storage outside Postgres (Vercel Blob)
--   * contains_pii: explicit retention/legal-hold signal — reports persist member emails
--   * (status, updated_at) index supports stale `processing` reclaim watchdog

ALTER TABLE "compliance_reports"
  ADD COLUMN "error_code" TEXT,
  ADD COLUMN "pdf_blob_url" TEXT,
  ADD COLUMN "pdf_blob_path" TEXT,
  ADD COLUMN "contains_pii" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON TABLE  "compliance_reports" IS
  'Compliance summary reports. Rows persist member emails and decision reasons that may include PII signals — treat as PII-bearing for retention and legal-hold logic. See contains_pii.';

COMMENT ON COLUMN "compliance_reports"."contains_pii" IS
  'True when the row contains PII (member roster, decision reasons). Defaults to true; flip to false only after a deliberate scrub.';

COMMENT ON COLUMN "compliance_reports"."error_code" IS
  'Stable, client-safe error enum (e.g. generation_failed). The raw error_message is for server-side observability only and must not be returned by the public API.';

COMMENT ON COLUMN "compliance_reports"."pdf_blob_url" IS
  'Vercel Blob URL for the rendered PDF. When present, downloads stream from blob and pdf_data may be null.';

CREATE INDEX "compliance_reports_status_updated_at_idx"
  ON "compliance_reports"("status", "updated_at");
