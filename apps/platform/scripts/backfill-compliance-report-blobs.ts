#!/usr/bin/env -S node --import tsx
/**
 * GOV-1885 — Backfill compliance report PDFs into Vercel Blob.
 *
 * Walks every ComplianceReport row that has inline `pdfData` but no
 * `pdfBlobUrl`, uploads the PDF bytes to Vercel Blob, persists the URL/path on
 * the row, then nulls out `pdfData`. Resumable: re-runs skip rows that already
 * have a blob URL.
 *
 * Requires:
 *   DATABASE_URL              — production Postgres
 *   BLOB_READ_WRITE_TOKEN     — Vercel Blob write token
 *
 * Usage:
 *   pnpm --filter @governs-ai/platform exec tsx \
 *     apps/platform/scripts/backfill-compliance-report-blobs.ts [--dry-run] [--batch=50]
 */

import { prisma } from '@governs-ai/db';
import {
  isBlobStorageConfigured,
  storeReportPdf,
} from '@/lib/services/compliance-report-storage';

interface CliFlags {
  dryRun: boolean;
  batchSize: number;
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { dryRun: false, batchSize: 50 };
  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg.startsWith('--batch=')) flags.batchSize = Number(arg.split('=')[1]) || 50;
  }
  return flags;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  if (!isBlobStorageConfigured()) {
    console.error('BLOB_READ_WRITE_TOKEN is not set. Aborting.');
    process.exit(1);
  }

  console.log(
    `Backfill starting (dryRun=${flags.dryRun} batchSize=${flags.batchSize})`
  );

  let totalScanned = 0;
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let cursor: string | null = null;

  for (;;) {
    const rows = await prisma.complianceReport.findMany({
      where: {
        status: 'ready',
        pdfBlobUrl: null,
        pdfData: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: flags.batchSize,
      select: { id: true, orgId: true, pdfData: true },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      totalScanned += 1;
      cursor = row.id;

      if (!row.pdfData) {
        totalSkipped += 1;
        continue;
      }

      if (flags.dryRun) {
        console.log(`[dry-run] would upload ${row.id} (org=${row.orgId})`);
        continue;
      }

      try {
        const stored = await storeReportPdf({
          reportId: row.id,
          orgId: row.orgId,
          pdf: Buffer.from(row.pdfData),
        });

        if (!stored) {
          totalFailed += 1;
          console.error(`upload returned null for ${row.id}`);
          continue;
        }

        await prisma.complianceReport.update({
          where: { id: row.id },
          data: {
            pdfBlobUrl: stored.url,
            pdfBlobPath: stored.pathname,
            pdfData: null,
            containsPii: true,
          },
        });

        totalUploaded += 1;
        console.log(`uploaded ${row.id} -> ${stored.pathname}`);
      } catch (error) {
        totalFailed += 1;
        console.error(`failed ${row.id}:`, error);
      }
    }
  }

  console.log(
    `Backfill done: scanned=${totalScanned} uploaded=${totalUploaded} skipped=${totalSkipped} failed=${totalFailed}`
  );

  if (totalFailed > 0) {
    process.exit(2);
  }
}

main()
  .catch((error) => {
    console.error('Backfill crashed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
