'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  LoadingSpinner,
  PageHeader,
} from '@governs-ai/ui';
import { CheckCircle, Clock, RefreshCw, ShieldQuestion, XCircle } from 'lucide-react';
import PlatformShell from '@/components/platform-shell';
import { useOrgReady } from '@/lib/use-org-ready';

interface Confirmation {
  correlationId: string;
  requestType: string;
  requestDesc: string;
  requestPayload: unknown;
  reasons: string[];
  status: string;
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
  user?: { email: string; name: string | null };
  canDecide: boolean;
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: '', label: 'All' },
] as const;

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  denied: 'destructive',
};

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const minutes = Math.round(ms / 60000);
  return minutes < 60 ? `${minutes}m left` : `${Math.round(minutes / 60)}h left`;
}

export default function ApprovalsPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const { isReady } = useOrgReady(orgSlug);

  const [tab, setTab] = useState<string>('pending');
  const [items, setItems] = useState<Confirmation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = tab ? `?status=${tab}` : '';
      const res = await fetch(`/api/v1/confirmations${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load approvals (${res.status})`);
      const data = await res.json();
      setItems(data.confirmations || []);
      setPendingCount(data.pendingCount || 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!isReady) return;
    load();
    // Agents wait on these; keep the inbox fresh.
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [isReady, load]);

  const decide = async (correlationId: string, outcome: 'approve' | 'deny') => {
    setBusy(correlationId);
    try {
      const res = await fetch(`/api/v1/confirmation/${correlationId}/${outcome}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Could not ${outcome} (${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not ${outcome}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title="Approvals"
          subtitle="Requests your policies marked as confirm. The agent waits until someone approves or denies."
          actions={
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          }
        />

        <div className="flex gap-2">
          {TABS.map((t) => (
            <Button
              key={t.label}
              size="sm"
              variant={tab === t.key ? 'default' : 'outline'}
              onClick={() => {
                setLoading(true);
                setTab(t.key);
              }}
            >
              {t.label}
              {t.key === 'pending' && pendingCount > 0 && (
                <span className="ml-2 rounded-full bg-yellow-500 px-2 text-xs text-white">
                  {pendingCount}
                </span>
              )}
            </Button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ShieldQuestion className="h-6 w-6 text-muted-foreground" />}
            title={tab === 'pending' ? 'Nothing waiting for approval' : 'No approval requests yet'}
            description="When a policy rule's action is confirm, the request is held here until someone decides. Set one up on the Policies page, e.g. confirm on payment or email tools."
            action={
              <Link href={`/o/${orgSlug}/policies`}>
                <Button variant="outline" size="sm">Open policies</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <Card key={c.correlationId}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.requestDesc}</span>
                        <Badge variant={STATUS_VARIANT[c.status] || 'secondary'}>{c.status}</Badge>
                        <Badge variant="outline">{c.requestType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested by {c.user?.name || c.user?.email || 'unknown'} ·{' '}
                        {new Date(c.createdAt).toLocaleString()}
                        {c.status === 'pending' && (
                          <>
                            {' '}· <Clock className="inline h-3 w-3" /> {timeLeft(c.expiresAt)}
                          </>
                        )}
                      </p>
                      {c.reasons?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Why: <span className="font-mono">{c.reasons.join(', ')}</span>
                        </p>
                      )}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Request details</summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 font-mono">
                          {JSON.stringify(c.requestPayload, null, 2)}
                        </pre>
                      </details>
                    </div>
                    {c.status === 'pending' && c.canDecide && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          disabled={busy === c.correlationId}
                          onClick={() => decide(c.correlationId, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === c.correlationId}
                          onClick={() => decide(c.correlationId, 'deny')}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Deny
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
