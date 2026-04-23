import 'server-only';
import { createHmac } from 'crypto';
import { prisma } from '@governs-ai/db';

function hmacKey(rawKey: string): string {
  const secret = process.env.KEY_HMAC_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret).update(rawKey).digest('hex');
}

/**
 * Insert or reactivate a key in precheck's api_keys table.
 * No-op if KEY_HMAC_SECRET is not set (local dev without precheck).
 */
export async function syncKeyToPrecheck(
  rawKey: string,
  userId: string,
  orgId: string,
  expiresAt?: Date | null
): Promise<void> {
  if (!process.env.KEY_HMAC_SECRET) {
    console.warn('[precheck-sync] KEY_HMAC_SECRET not set — skipping api_keys sync');
    return;
  }
  const keyHash = hmacKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);
  await prisma.$executeRaw`
    INSERT INTO api_keys (key_hash, key_prefix, user_id, org_id, created_at, is_active, expires_at)
    VALUES (${keyHash}, ${keyPrefix}, ${userId}, ${orgId}, NOW(), true, ${expiresAt ?? null})
    ON CONFLICT (key_hash) DO UPDATE
      SET is_active = true, expires_at = EXCLUDED.expires_at, org_id = EXCLUDED.org_id
  `;
}

/**
 * Deactivate a key in precheck's api_keys table.
 * No-op if KEY_HMAC_SECRET is not set.
 */
export async function deactivateKeyInPrecheck(rawKey: string): Promise<void> {
  if (!process.env.KEY_HMAC_SECRET) return;
  const keyHash = hmacKey(rawKey);
  await prisma.$executeRaw`
    UPDATE api_keys SET is_active = false WHERE key_hash = ${keyHash}
  `;
}
