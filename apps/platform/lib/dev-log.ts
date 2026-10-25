/**
 * Log a one-time auth token (email verification, password reset, invite).
 *
 * Local development has no real email delivery, so the token in the server
 * log is how a developer (or the e2e harness) completes the flow. Anywhere
 * else it is a live credential in the logs, so it is only written when
 * LOG_AUTH_TOKENS=true, or by default under `next dev`.
 */
export function logAuthToken(kind: string, email: string, token: string): void {
  const flag = process.env.LOG_AUTH_TOKENS;
  const enabled = flag ? flag === 'true' : process.env.NODE_ENV === 'development';
  if (enabled) {
    console.log(`${kind} token for ${email}: ${token}`);
  }
}
