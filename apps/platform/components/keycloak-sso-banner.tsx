'use client';

import * as React from 'react';
import { Button } from '@governs-ai/ui';
import { useUser } from '@/lib/user-context';

export function KeycloakSsoBanner() {
  const { user, loading, refetch } = useUser();
  const sync = user?.keycloakSync;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [needsPassword, setNeedsPassword] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  if (loading) return null;
  if (!sync || sync.status !== 'DEGRADED') return null;

  const nextRetry = sync.nextRetryAt ? new Date(sync.nextRetryAt) : null;

  const runRetry = async (maybePassword?: string) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch('/api/v1/sso/keycloak/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(maybePassword ? { password: maybePassword } : {}),
      });

      const data = await res.json().catch(() => ({} as any));

      if (data?.requiresPassword) {
        setNeedsPassword(true);
        return;
      }

      if (!res.ok) {
        setError(data?.error || 'Retry failed');
        return;
      }

      setNeedsPassword(false);
      setPassword('');
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="font-medium">SSO not ready — retrying</div>
          <div className="text-sm text-amber-900">
            External “Login with GovernsAI” may not work until Keycloak sync completes.
            {nextRetry ? (
              <span className="ml-2">
                Next automatic retry: <span className="font-mono">{nextRetry.toLocaleString()}</span>
              </span>
            ) : null}
          </div>
          {sync.lastError ? (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer select-none">Show last error</summary>
              <pre className="mt-2 overflow-auto rounded bg-white/60 p-2">{sync.lastError}</pre>
            </details>
          ) : null}
          {error ? <div className="mt-2 text-sm text-red-700">{error}</div> : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:flex-row md:items-center">
          {needsPassword ? (
            <input
              className="h-9 w-full rounded border border-amber-300 bg-white px-3 text-sm outline-none md:w-56"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to retry"
            />
          ) : null}

          <Button
            variant="secondary"
            className="h-9"
            disabled={isSubmitting || (needsPassword && password.length === 0)}
            onClick={() => runRetry(needsPassword ? password : undefined)}
          >
            {isSubmitting ? 'Retrying…' : 'Retry Keycloak sync'}
          </Button>
        </div>
      </div>
    </div>
  );
}
