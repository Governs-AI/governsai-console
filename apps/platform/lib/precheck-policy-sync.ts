import 'server-only';
import { createHmac } from 'crypto';

/**
 * Fire-and-forget invalidation ping to precheck after a policy write.
 *
 * Contract (ADR-005):
 *   POST  $PRECHECK_INVALIDATE_URL
 *   body: { "org_id": "<id>" }
 *   header: X-Govs-Invalidate-HMAC: hex(hmac_sha256(KEY_HMAC_SECRET, org_id))
 *
 * Never throws — a precheck outage must not block dashboard policy writes.
 * The 60s TTL on the precheck side is the backstop if this call is dropped.
 */
export async function invalidatePrecheckPolicy(orgId: string): Promise<void> {
  const url = process.env.PRECHECK_INVALIDATE_URL;
  const secret = process.env.KEY_HMAC_SECRET;
  if (!url || !secret) {
    // Silent in local dev (env not wired); intentional.
    return;
  }
  try {
    const sig = createHmac('sha256', secret).update(orgId).digest('hex');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-govs-invalidate-hmac': sig,
      },
      body: JSON.stringify({ org_id: orgId }),
      signal: controller.signal,
    }).catch(() => undefined);
    clearTimeout(timer);
  } catch {
    // best-effort only
  }
}
