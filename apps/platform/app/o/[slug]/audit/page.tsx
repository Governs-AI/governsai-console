'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  LoadingSpinner,
  PageHeader,
} from '@governs-ai/ui';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react';
import PlatformShell from '@/components/platform-shell';
import { useOrgReady } from '@/lib/use-org-ready';
import { buildAuditExportUrl } from '@/lib/audit-export-url';

interface AuditEvent {
  id: string;
  orgId: string;
  direction: 'precheck' | 'postcheck';
  decision: 'allow' | 'transform' | 'deny';
  tool?: string | null;
  correlationId?: string | null;
  policyId?: string | null;
  ts: string;
}

interface AuditResponse {
  events: AuditEvent[];
  pagination: { limit: number; offset: number; total: number; hasMore: boolean };
}

interface Filters {
  decision: '' | 'allow' | 'transform' | 'deny';
  tool: string;
  user: string;
  from: string;
  to: string;
}

const PAGE_SIZE = 50;
const EMPTY_FILTERS: Filters = { decision: '', tool: '', user: '', from: '', to: '' };

function toQueryString(filters: Filters, offset: number): string {
  const params = new URLSearchParams();
  if (filters.decision) params.set('decision', filters.decision);
  if (filters.tool.trim()) params.set('tool', filters.tool.trim());
  if (filters.user.trim()) params.set('user', filters.user.trim());
  if (filters.from) params.set('from', new Date(filters.from).toISOString());
  if (filters.to) params.set('to', new Date(filters.to).toISOString());
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));
  return params.toString();
}

function decisionBadge(decision: AuditEvent['decision']) {
  const variant =
    decision === 'allow' ? 'default' : decision === 'transform' ? 'secondary' : 'destructive';
  const icon =
    decision === 'allow' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : decision === 'transform' ? (
      <Zap className="h-4 w-4 text-yellow-500" />
    ) : decision === 'deny' ? (
      <XCircle className="h-4 w-4 text-red-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-gray-500" />
    );
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {icon}
      {decision}
    </Badge>
  );
}

export default function AuditLogPage() {
  const params = useParams();
  const orgSlug = params?.slug as string;
  const { org, isReady, loading: orgLoading } = useOrgReady(orgSlug);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (f: Filters, pageOffset: number) => {
      setRefreshing(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/audit?${toQueryString(f, pageOffset)}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body?.error ?? `Request failed (${res.status})`);
          return;
        }
        setData((await res.json()) as AuditResponse);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isReady || !org) return;
    fetchEvents(appliedFilters, offset);
  }, [isReady, org?.id, appliedFilters, offset, fetchEvents]);

  const applyFilters = () => {
    setOffset(0);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setOffset(0);
  };

  const handleExport = useCallback(async () => {
    setExportError(null);
    if (appliedFilters.from && appliedFilters.to) {
      const s = new Date(appliedFilters.from).getTime();
      const e = new Date(appliedFilters.to).getTime();
      if (Number.isFinite(s) && Number.isFinite(e) && s > e) {
        setExportError('"From" must be before "To".');
        return;
      }
    }

    const url = buildAuditExportUrl(appliedFilters);
    setExporting(true);
    try {
      // HEAD the endpoint first so we can surface auth/validation errors
      // without having started a download. The GET that follows streams
      // straight to disk via an <a download> click — no client-side buffering.
      const probe = await fetch(url, { method: 'HEAD', credentials: 'include' });
      if (!probe.ok) {
        let msg = `Export failed (${probe.status}).`;
        if (probe.headers.get('content-type')?.includes('application/json')) {
          const body = await probe.json().catch(() => null);
          if (body?.error) msg = body.error;
        }
        setExportError(msg);
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setExportError((err as Error).message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  }, [appliedFilters]);

  const pagination = data?.pagination;
  const pageInfo = useMemo(() => {
    if (!pagination) return null;
    const start = pagination.total === 0 ? 0 : pagination.offset + 1;
    const end = pagination.offset + (data?.events.length ?? 0);
    return `${start}–${end} of ${pagination.total}`;
  }, [pagination, data?.events.length]);

  if (!orgLoading && !org) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64" data-testid="audit-org-not-found-state">
          <p className="text-muted-foreground">Organization not found.</p>
        </div>
      </PlatformShell>
    );
  }

  if (loading) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64" data-testid="audit-loading-state">
          <LoadingSpinner size="lg" />
        </div>
      </PlatformShell>
    );
  }

  const events = data?.events ?? [];

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6" data-testid="audit-page">
        <PageHeader
          title="Audit Log"
          subtitle={`Compliance-grade log of AI governance decisions for ${orgSlug}. Filter by decision, tool, user, or time range.`}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                disabled={exporting}
                variant="outline"
                size="sm"
                data-testid="audit-export-csv"
              >
                {exporting ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button
                onClick={() => fetchEvents(appliedFilters, offset)}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                {refreshing ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          }
        />

        <Card>
          <CardContent className="p-4" data-testid="audit-filter-controls">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Decision</label>
                <select
                  value={filters.decision}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, decision: e.target.value as Filters['decision'] }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="audit-filter-decision"
                >
                  <option value="">All decisions</option>
                  <option value="allow">Allow</option>
                  <option value="transform">Transform</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tool</label>
                <input
                  type="text"
                  value={filters.tool}
                  onChange={(e) => setFilters((prev) => ({ ...prev, tool: e.target.value }))}
                  placeholder="e.g. search_web"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="audit-filter-tool"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">User</label>
                <input
                  type="text"
                  value={filters.user}
                  onChange={(e) => setFilters((prev) => ({ ...prev, user: e.target.value }))}
                  placeholder="correlation id"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="audit-filter-user"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
                <input
                  type="datetime-local"
                  value={filters.from}
                  onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="audit-filter-from"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
                <input
                  type="datetime-local"
                  value={filters.to}
                  onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="audit-filter-to"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={applyFilters} size="sm" data-testid="audit-filter-apply">
                Apply filters
              </Button>
              <Button onClick={resetFilters} variant="outline" size="sm" data-testid="audit-filter-reset">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card data-testid="audit-error">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {exportError && (
          <Card data-testid="audit-export-error">
            <CardContent className="p-4 text-sm text-destructive">{exportError}</CardContent>
          </Card>
        )}

        {events.length === 0 ? (
          <Card data-testid="audit-empty-state">
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Events</h3>
              <p className="text-muted-foreground">
                No audit events match the current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden" data-testid="audit-table">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Decision</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Direction</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tool</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Correlation ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-muted/30"
                    data-testid={`audit-row-${event.id}`}
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(event.ts).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{decisionBadge(event.decision)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {event.direction === 'precheck' ? 'Pre-check' : 'Post-check'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{event.tool ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {event.correlationId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {event.policyId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <div className="flex items-center justify-between" data-testid="audit-pagination">
            <span className="text-sm text-muted-foreground">{pageInfo}</span>
            <div className="flex gap-2">
              <Button
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                disabled={offset === 0 || refreshing}
                variant="outline"
                size="sm"
                data-testid="audit-page-prev"
              >
                Previous
              </Button>
              <Button
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                disabled={!pagination.hasMore || refreshing}
                variant="outline"
                size="sm"
                data-testid="audit-page-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
