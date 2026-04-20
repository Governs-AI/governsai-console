-- Add self-serve billing state to organizations
ALTER TABLE "Org"
  ADD COLUMN "billing_tier" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN "billing_status" TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "stripe_subscription_id" TEXT;

CREATE UNIQUE INDEX "Org_stripe_customer_id_key" ON "Org"("stripe_customer_id");
CREATE UNIQUE INDEX "Org_stripe_subscription_id_key" ON "Org"("stripe_subscription_id");
