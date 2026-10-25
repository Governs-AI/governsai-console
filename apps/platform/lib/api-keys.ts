import { createHash, randomBytes } from 'crypto';

/**
 * API keys are stored as a SHA-256 hash plus a short display prefix. The full
 * key exists only in the response to the request that created it.
 *
 * The hash is unsalted on purpose: keys are 256-bit random values, so a
 * deterministic hash is safe and lets every service (dashboard, websocket
 * service, precheck) look a key up by hashing the header it received.
 */
export const KEY_PREFIX_LENGTH = 12;

/** Short-lived keys the dashboard mints for policy previews; hidden from key lists. */
export const PREVIEW_KEY_SCOPE = 'preview';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

export function apiKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, KEY_PREFIX_LENGTH);
}

/** What the UI shows for a stored key, e.g. `gai_3f9c01ab…`. */
export function keyPreview(keyPrefix: string | null | undefined): string {
  return `${keyPrefix || ''}…`;
}

export function generateApiKey(prefix = 'gai_'): { rawKey: string; keyHash: string; keyPrefix: string } {
  const rawKey = `${prefix}${randomBytes(32).toString('hex')}`;
  return { rawKey, keyHash: hashApiKey(rawKey), keyPrefix: apiKeyPrefix(rawKey) };
}
