import { put, del, type PutBlobResult } from '@vercel/blob';

export interface StoredReportPdf {
  url: string;
  pathname: string;
}

interface StoreOptions {
  reportId: string;
  orgId: string;
  pdf: Buffer;
}

const BLOB_TOKEN_ENV = 'BLOB_READ_WRITE_TOKEN';

function blobConfigured(): boolean {
  return Boolean(process.env[BLOB_TOKEN_ENV]);
}

export function isBlobStorageConfigured(): boolean {
  return blobConfigured();
}

export function buildReportBlobPath(orgId: string, reportId: string): string {
  // Path scoped by org so accidental cross-tenant globs are impossible.
  return `compliance-reports/${orgId}/${reportId}.pdf`;
}

export async function storeReportPdf(options: StoreOptions): Promise<StoredReportPdf | null> {
  if (!blobConfigured()) {
    return null;
  }

  const pathname = buildReportBlobPath(options.orgId, options.reportId);
  const result: PutBlobResult = await put(pathname, options.pdf, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/pdf',
    cacheControlMaxAge: 0,
  });

  return { url: result.url, pathname: result.pathname };
}

export async function deleteReportPdf(pathnameOrUrl: string): Promise<void> {
  if (!blobConfigured()) {
    return;
  }
  await del(pathnameOrUrl);
}

export async function fetchReportPdfBytes(blobUrl: string): Promise<Buffer> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch report PDF from blob (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
