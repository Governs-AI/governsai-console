'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { POLICY_TEMPLATES } from '@/lib/policy-templates';

/**
 * First-run checklist: policy → API key → first governed request → audit.
 *
 * Each step is derived from real data (policies, keys, decisions), so the
 * card reflects what the org has actually done and disappears once the loop
 * has run end to end — or when the user dismisses it.
 */

const PRECHECK_URL = process.env.NEXT_PUBLIC_PRECHECK_URL || 'http://localhost:8082';
const SAMPLE_TEXT = 'please send the invoice to jane.doe@example.com, card 4111 1111 1111 1111';
const QUICKSTART_TEMPLATES = ['agent-guardrails', 'fintech-strict'];

interface Status {
  policies: number;
  keys: number;
  decisions: number;
}

interface PreviewResult {
  decision: string;
  rawTextOut: string;
  reasons: string[];
}

const dismissKey = (orgSlug: string) => `governs:get-started-dismissed:${orgSlug}`;

function readDismissed(orgSlug: string) {
  try {
    return window.localStorage.getItem(dismissKey(orgSlug)) === '1';
  } catch {
    return false;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
      aria-label="Copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function Step({
  n,
  done,
  title,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done ? 'bg-green-500 text-white' : 'border border-border text-muted-foreground'
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className={`text-sm font-medium ${done ? 'text-muted-foreground' : ''}`}>{title}</p>
        {!done && children}
      </div>
    </li>
  );
}

export function GetStarted({
  orgSlug,
  orgId,
  canManage,
}: {
  orgSlug: string;
  orgId: string;
  canManage: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  useEffect(() => setDismissed(readDismissed(orgSlug)), [orgSlug]);

  const load = useCallback(async () => {
    try {
      const [p, k, d] = await Promise.all([
        fetch('/api/v1/policies', { credentials: 'include' }),
        fetch('/api/v1/keys', { credentials: 'include' }),
        fetch('/api/v1/decisions?limit=1', { credentials: 'include' }),
      ]);
      const policies = p.ok ? (await p.json()).policies?.length ?? 0 : 0;
      const keysBody = k.ok ? await k.json() : [];
      const keys = Array.isArray(keysBody) ? keysBody.filter((x: any) => x.isActive).length : 0;
      const decisions = d.ok ? (await d.json()).decisions?.length ?? 0 : 0;
      setStatus({ policies, keys, decisions });
    } catch {
      // Leave the previous status in place; the next poll retries.
    }
  }, []);

  const complete = !!status && status.policies > 0 && status.keys > 0 && status.decisions > 0;

  useEffect(() => {
    if (dismissed) return;
    load();
    // Waiting for the first decision is the step users sit on; poll it.
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [dismissed, load]);

  // Once the loop has run, stay only while there is something to read.
  if (dismissed || !status || (complete && !preview && !newKey)) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(dismissKey(orgSlug), '1');
    } catch {
      // Storage unavailable: hide for this visit only.
    }
    setDismissed(true);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const applyTemplate = (id: string) =>
    run(id, async () => {
      const template = POLICY_TEMPLATES.find((t) => t.id === id)!;
      const res = await fetch('/api/v1/policies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(template.build([])),
      });
      if (!res.ok) throw new Error(`Could not create the policy (${res.status})`);
    });

  const createKey = () =>
    run('key', async () => {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Getting started', scopes: ['precheck'] }),
      });
      if (!res.ok) throw new Error(`Could not create a key (${res.status})`);
      setNewKey((await res.json()).key);
    });

  const tryIt = () =>
    run('preview', async () => {
      const res = await fetch('/api/v1/policies/preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tool: 'model.chat', input: SAMPLE_TEXT, scope: 'net.external' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Preview failed (${res.status})`);
      setPreview(body);
    });

  const keyForSnippet = newKey || '<YOUR_API_KEY>';
  const curl = `curl -X POST ${PRECHECK_URL}/api/v1/precheck \\
  -H "X-Governs-Key: ${keyForSnippet}" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"model.chat","scope":"net.external","raw_text":"${SAMPLE_TEXT}"}'`;
  const ts = `import { GovernsAIClient } from '@governs-ai/sdk';

const governs = new GovernsAIClient({
  apiKey: process.env.GOVERNS_API_KEY!,
  baseUrl: '${typeof window !== 'undefined' ? window.location.origin : ''}',
  precheckBaseUrl: '${PRECHECK_URL}',
  orgId: '${orgId}',
});

const res = await governs.precheck({ tool: 'model.chat', scope: 'net.external', raw_text: prompt });
if (res.decision === 'deny') throw new Error(res.reasons?.join(', '));
const safePrompt = res.decision === 'transform' ? res.raw_text_out : prompt;`;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Get started with GovernsAI</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Four steps to your first governed request. This card updates as you go.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <ol className="space-y-5">
          <Step n={1} done={status.policies > 0} title="Choose a policy">
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {QUICKSTART_TEMPLATES.map((id) => {
                  const t = POLICY_TEMPLATES.find((x) => x.id === id)!;
                  return (
                    <Button
                      key={id}
                      size="sm"
                      variant={t.recommended ? 'default' : 'outline'}
                      disabled={!!busy}
                      onClick={() => applyTemplate(id)}
                      title={t.description}
                    >
                      {busy === id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Use “{t.title}”
                    </Button>
                  );
                })}
                <Link href={`/o/${orgSlug}/policies`}>
                  <Button size="sm" variant="ghost">More templates</Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ask an org admin to create a policy.</p>
            )}
          </Step>

          <Step n={2} done={status.keys > 0} title="Create an API key">
            <Button size="sm" variant="outline" disabled={!!busy} onClick={createKey}>
              {busy === 'key' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create key
            </Button>
          </Step>

          {newKey && (
            <li className="ml-9 space-y-1">
              <p className="text-xs text-muted-foreground">
                Your key — copy it now, it won’t be shown again:
              </p>
              <div className="relative rounded-md bg-muted p-2 pr-10 font-mono text-xs break-all">
                {newKey}
                <CopyButton text={newKey} />
              </div>
            </li>
          )}

          <Step
            n={3}
            done={status.decisions > 0}
            title="Send your first request through precheck"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={!!busy || status.policies === 0 || status.keys === 0}
                onClick={tryIt}
              >
                {busy === 'preview' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Try it with a sample
              </Button>
              <span className="text-xs text-muted-foreground">
                or call it from your app:
              </span>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">curl</summary>
              <pre className="relative mt-2 overflow-x-auto rounded-md bg-muted p-3 pr-10 font-mono">
                {curl}
                <CopyButton text={curl} />
              </pre>
            </details>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">TypeScript SDK</summary>
              <pre className="relative mt-2 overflow-x-auto rounded-md bg-muted p-3 pr-10 font-mono">
                {ts}
                <CopyButton text={ts} />
              </pre>
            </details>
          </Step>

          {preview && (
            <li className="ml-9 space-y-1 rounded-md border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Decision:</span>
                <Badge variant={preview.decision === 'deny' ? 'destructive' : preview.decision === 'allow' ? 'success' : 'warning'}>
                  {preview.decision}
                </Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">in: {SAMPLE_TEXT}</p>
              <p className="font-mono text-xs">out: {preview.rawTextOut}</p>
              {preview.reasons?.length > 0 && (
                <p className="font-mono text-xs text-muted-foreground">{preview.reasons.join(', ')}</p>
              )}
            </li>
          )}

          <Step n={4} done={status.decisions > 0} title="See it in the audit log">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for the first decision…
            </p>
          </Step>
          {status.decisions > 0 && (
            <li className="ml-9 flex flex-wrap gap-2">
              <Link href={`/o/${orgSlug}/audit`}>
                <Button size="sm">Open audit log</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={dismiss}>Done</Button>
            </li>
          )}
        </ol>
      </CardContent>
    </Card>
  );
}
