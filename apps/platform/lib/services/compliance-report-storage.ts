import { put, del, type PutBlobResult } from '@vercel/blob';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

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
const ENCRYPTION_KEY_ENV = 'COMPLIANCE_REPORT_ENCRYPTION_KEY';

// Wire format for an encrypted PDF blob. The blob is treated as opaque
// ciphertext: even though Vercel Blob serves the URL publicly, the bytes
// behind that URL cannot be decrypted without the platform-held key, so a
// URL leak alone does not disclose PII. The leading magic + version let
// future migrations (e.g. KMS-backed keys, per-org subkeys) detect old
// blobs and decrypt them with the right path.
const MAGIC = Buffer.from('GACPDF1\0', 'utf8'); // 8 bytes: GovernsAI Compliance PDF v1
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + IV_LENGTH + TAG_LENGTH;

function blobConfigured(): boolean {
  return Boolean(process.env[BLOB_TOKEN_ENV]);
}

function readEncryptionKey(): Buffer {
  const raw = process.env[ENCRYPTION_KEY_ENV];
  if (!raw) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} is required when ${BLOB_TOKEN_ENV} is set. Generate ` +
        "a 32-byte key with `openssl rand -hex 32` and configure it per environment.",
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} must be a 64-character hex string (32 bytes); got ${key.length} bytes.`,
    );
  }
  return key;
}

function encryptPdf(pdf: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(pdf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, ciphertext]);
}

function decryptPdf(payload: Buffer, key: Buffer): Buffer {
  if (payload.length < HEADER_LENGTH) {
    throw new Error('encrypted PDF payload truncated');
  }
  const magic = payload.subarray(0, MAGIC.length);
  if (!magic.equals(MAGIC)) {
    throw new Error('encrypted PDF magic header missing or unrecognized');
  }
  const iv = payload.subarray(MAGIC.length, MAGIC.length + IV_LENGTH);
  const tag = payload.subarray(MAGIC.length + IV_LENGTH, HEADER_LENGTH);
  const ciphertext = payload.subarray(HEADER_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
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

  const key = readEncryptionKey();
  const encrypted = encryptPdf(options.pdf, key);
  const pathname = buildReportBlobPath(options.orgId, options.reportId);
  // Blob remains publicly addressable — the encrypted payload is the security
  // boundary. The admin-gated /api/v1/reports/:id route fetches and decrypts.
  const result: PutBlobResult = await put(pathname, encrypted, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/octet-stream',
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
  const payload = Buffer.from(arrayBuffer);
  const key = readEncryptionKey();
  return decryptPdf(payload, key);
}

// Internal — exported only so unit tests can pin the encryption envelope and
// verify that ciphertext at rest does not contain plaintext bytes.
export const __internal = {
  encryptPdf,
  decryptPdf,
  HEADER_LENGTH,
  MAGIC,
};
