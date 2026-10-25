#!/usr/bin/env bash
# Adopt `prisma migrate deploy` on a database that was built with `db push`
# (no _prisma_migrations table, so deploy refuses it with P3005).
#
# Each migration has a marker: a query that is true once its changes are in
# the database. Migrations whose markers hold are marked applied; `migrate
# deploy` then runs the rest, in order. The catch-up migration has no marker and always runs (it is idempotent).
# A database still holding plaintext API keys gets them hashed by deploy.
#
# Usage: DATABASE_URL=postgres://... scripts/baseline-pushed-db.sh
# Add a marker here when you add a migration.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?DATABASE_URL is required}"
PRISMA="npx --yes prisma@5.22.0"

col() { echo "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='$1' AND column_name='$2')"; }
tbl() { echo "to_regclass('public.\"$1\"') IS NOT NULL"; }

MARKERS=(
  "20251015154425_|$(tbl Org)"
  "20251017154853_add_summary_field_to_context_memory|$(col context_memory summary)"
  "20251212185207_|$(tbl keycloak_sync_state)"
  "20251219_refrag_implementation|$(tbl context_chunks)"
  "20251219_tiered_retention|$(col context_memory retention)"
  "20251220_refrag_analytics_token_savings|$(col refrag_analytics token_savings_percent)"
  "20260102191843_|EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='context_memory' AND column_name='chunks_computed' AND is_nullable='NO')"
  "20260424144000_add_compliance_reports|$(tbl compliance_reports)"
  "20260424180000_compliance_report_hardening|$(col compliance_reports error_code)"
  "20261025120000_hash_api_keys|NOT $(col APIKey key)"
  "20261025130000_catch_up_schema_drift|false"
)

# Read-only boolean query through the generated Prisma client (no psql needed).
holds() {
  node -e '
    const { PrismaClient } = require("@prisma/client");
    const p = new PrismaClient();
    p.$queryRawUnsafe(`SELECT (${process.argv[1]}) AS ok`)
      .then((r) => { console.log(r[0].ok ? "yes" : "no"); return p.$disconnect(); })
      .catch((e) => { console.error(e.message); process.exit(1); });
  ' "$1"
}

if [ "$(holds "$(tbl _prisma_migrations)")" = "yes" ]; then
  echo "Migration history exists; running deploy."
  exec $PRISMA migrate deploy --schema=./schema.prisma
fi

known=$(printf '%s\n' "${MARKERS[@]}" | cut -d'|' -f1 | sort)
present=$(ls migrations | grep -v migration_lock | sort)
if [ "$known" != "$present" ]; then
  echo "Migrations without a marker in $0:" >&2
  comm -13 <(echo "$known") <(echo "$present") >&2
  exit 1
fi

for entry in "${MARKERS[@]}"; do
  name=${entry%%|*}
  [ "$(holds "${entry#*|}")" = "yes" ] || continue
  $PRISMA migrate resolve --applied "$name" --schema=./schema.prisma >/dev/null
  echo "baselined $name"
done

$PRISMA migrate deploy --schema=./schema.prisma
