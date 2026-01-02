'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  KpiCard, 
  PageHeader, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
  LoadingSpinner
} from '@governs-ai/ui';
import PlatformShell from '@/components/platform-shell';
import { useRoleCheck } from '@/components/role-guard';
import { useUser } from '@/lib/user-context';
import { useOrgReady } from '@/lib/use-org-ready';

type Trend = 'up' | 'down' | 'neutral';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const { canAccessAdmin } = useRoleCheck();
  const [kpiMeta, setKpiMeta] = useState({
    totalDecisions: { delta: undefined as string | undefined, trend: 'neutral' as Trend },
    allowRate: { delta: undefined as string | undefined, trend: 'neutral' as Trend },
    avgLatency: { delta: undefined as string | undefined, trend: 'neutral' as Trend },
    toolCalls: { delta: undefined as string | undefined, trend: 'neutral' as Trend },
  });
  const [dashboardData, setDashboardData] = useState({
    decisions: {
      total: 0,
      allowed: 0,
      denied: 0,
      avgLatency: 0
    },
    toolCalls: {
      total: 0,
      byTool: {} as Record<string, number>
    },
    recentDecisions: [] as any[],
    spend: {
      current: 0,
      monthly: 0
    }
  });
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.slug as string;
  const { user } = useUser();
  const { org, loading: orgLoading, isReady } = useOrgReady(orgSlug);

  const formatPercentChange = (current: number, previous: number) => {
    if (previous <= 0) return undefined;
    const percent = ((current - previous) / previous) * 100;
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const formatPpChange = (currentPp: number, previousPp: number) => {
    const delta = currentPp - previousPp;
    const abs = Math.abs(delta);
    const dir = delta >= 0 ? 'higher' : 'lower';
    return { deltaPp: delta, label: `${abs.toFixed(1)} pp ${dir}` };
  };

  useEffect(() => {
    if (!isReady || !org) return;
    fetchDashboardData(org.id, org.slug);
  }, [isReady, org?.id]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const fetchDashboardData = async (orgId: string, resolvedOrgSlug: string) => {
    setLoading(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const prevEndTime = startTime;
      const prevStartTime = new Date(prevEndTime.getTime() - 24 * 60 * 60 * 1000);

      const currentDecisionsParams = new URLSearchParams({
        orgId,
        includeStats: 'true',
        limit: '10',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      });
      const previousDecisionsParams = new URLSearchParams({
        orgId,
        includeStats: 'true',
        limit: '10',
        startTime: prevStartTime.toISOString(),
        endTime: prevEndTime.toISOString(),
      });

      const currentToolcallsParams = new URLSearchParams({
        orgId,
        includeStats: 'true',
        limit: '10',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      });
      const previousToolcallsParams = new URLSearchParams({
        orgId,
        includeStats: 'true',
        limit: '10',
        startTime: prevStartTime.toISOString(),
        endTime: prevEndTime.toISOString(),
      });

      const usageParams = new URLSearchParams({
        startDate: startTime.toISOString(),
        endDate: now.toISOString(),
        limit: '500',
      });

      const [
        currentDecisionsResponse,
        previousDecisionsResponse,
        currentToolcallsResponse,
        previousToolcallsResponse,
        spendResponse,
        usageResponse,
      ] = await Promise.all([
        fetch(`/api/v1/decisions?${currentDecisionsParams}`, { credentials: 'include' }),
        fetch(`/api/v1/decisions?${previousDecisionsParams}`, { credentials: 'include' }),
        fetch(`/api/v1/toolcalls?${currentToolcallsParams}`, { credentials: 'include' }),
        fetch(`/api/v1/toolcalls?${previousToolcallsParams}`, { credentials: 'include' }),
        fetch(`/api/v1/spend?orgSlug=${resolvedOrgSlug}&timeRange=30d`, { credentials: 'include' }),
        fetch(`/api/v1/usage?${usageParams}`, { credentials: 'include' }),
      ]);

      const [
        currentDecisionsData,
        previousDecisionsData,
        currentToolcallsData,
        previousToolcallsData,
        spendData,
        usageData,
      ] = await Promise.all([
        currentDecisionsResponse.ok ? currentDecisionsResponse.json() : { decisions: [], stats: null },
        previousDecisionsResponse.ok ? previousDecisionsResponse.json() : { decisions: [], stats: null },
        currentToolcallsResponse.ok ? currentToolcallsResponse.json() : { toolcalls: [], stats: null },
        previousToolcallsResponse.ok ? previousToolcallsResponse.json() : { toolcalls: [], stats: null },
        spendResponse.ok ? spendResponse.json() : { spend: null },
        usageResponse.ok ? usageResponse.json() : { records: [] },
      ]);

      const currentDecisionStats = currentDecisionsData.stats || {};
      const previousDecisionStats = previousDecisionsData.stats || {};
      const currentToolcallStats = currentToolcallsData.stats || {};
      const previousToolcallStats = previousToolcallsData.stats || {};

      const currentDecisionsTotal = currentDecisionStats.total || 0;
      const previousDecisionsTotal = previousDecisionStats.total || 0;
      const currentAllowed = currentDecisionStats.byDecision?.allow || 0;
      const previousAllowed = previousDecisionStats.byDecision?.allow || 0;

      const currentAllowRate = currentDecisionsTotal > 0 ? (currentAllowed / currentDecisionsTotal) * 100 : 0;
      const previousAllowRate = previousDecisionsTotal > 0 ? (previousAllowed / previousDecisionsTotal) * 100 : 0;

      const allowRateDelta = formatPpChange(currentAllowRate, previousAllowRate);

      const currentAvgLatency = currentDecisionStats.avgLatency || 0;
      const previousAvgLatency = previousDecisionStats.avgLatency || 0;
      const latencyDeltaMs = currentAvgLatency - previousAvgLatency;

      const currentToolcallsTotal = currentToolcallStats.total || 0;
      const previousToolcallsTotal = previousToolcallStats.total || 0;

      const costByCorrelationId = new Map<string, number>();
      (usageData.records || []).forEach((record: any) => {
        if (!record?.correlationId) return;
        const cost = Number(record.cost || 0);
        costByCorrelationId.set(
          record.correlationId,
          (costByCorrelationId.get(record.correlationId) || 0) + cost
        );
      });

      const decisionsWithCost = (currentDecisionsData.decisions || []).map((decision: any) => ({
        ...decision,
        cost: decision.correlationId
          ? costByCorrelationId.get(decision.correlationId) ?? null
          : null,
      }));

      const spendSummary = spendData?.spend
        ? {
            current: Number(spendData.spend.dailySpend || 0),
            monthly: Number(spendData.spend.monthlySpend || 0),
          }
        : { current: 0, monthly: 0 };

      setDashboardData({
        decisions: {
          total: currentDecisionsTotal,
          allowed: currentAllowed,
          denied: currentDecisionStats.byDecision?.deny || 0,
          avgLatency: currentAvgLatency
        },
        toolCalls: {
          total: currentToolcallsTotal,
          byTool: currentToolcallStats.byTool || {}
        },
        recentDecisions: decisionsWithCost,
        spend: spendSummary
      });

      setKpiMeta({
        totalDecisions: {
          delta: formatPercentChange(currentDecisionsTotal, previousDecisionsTotal),
          trend: currentDecisionsTotal >= previousDecisionsTotal ? 'up' : 'down',
        },
        allowRate: {
          delta: previousDecisionsTotal > 0 ? allowRateDelta.label : undefined,
          trend: previousDecisionsTotal > 0 ? (allowRateDelta.deltaPp >= 0 ? 'up' : 'down') : 'neutral',
        },
        avgLatency: {
          delta:
            previousAvgLatency > 0
              ? latencyDeltaMs < 0
                ? `${Math.abs(latencyDeltaMs)} ms faster`
                : latencyDeltaMs > 0
                  ? `${latencyDeltaMs} ms slower`
                  : '0 ms'
              : undefined,
          trend:
            previousAvgLatency > 0 ? (latencyDeltaMs <= 0 ? 'up' : 'down') : 'neutral',
        },
        toolCalls: {
          delta: formatPercentChange(currentToolcallsTotal, previousToolcallsTotal),
          trend: currentToolcallsTotal >= previousToolcallsTotal ? 'up' : 'down',
        },
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      // Don't set error here, just use default values
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
      });
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (!orgLoading && !org) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Organization not found.</p>
        </div>
      </PlatformShell>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title={`${orgSlug} Dashboard`}
          subtitle={`Welcome back, ${user?.name || user?.email}. Monitor your AI usage, track spending, and manage policies with complete visibility and control.`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
              <Button>Refresh</Button>
            </div>
          }
        />
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard 
            label="Total Decisions" 
            value={dashboardData.decisions.total.toLocaleString()} 
            delta={kpiMeta.totalDecisions.delta}
            trend={kpiMeta.totalDecisions.trend}
          />
          <KpiCard 
            label="Allow Rate" 
            value={dashboardData.decisions.total > 0 
              ? `${((dashboardData.decisions.allowed / dashboardData.decisions.total) * 100).toFixed(1)}%` 
              : "0%"
            } 
            delta={kpiMeta.allowRate.delta}
            trend={kpiMeta.allowRate.trend}
          />
          <KpiCard 
            label="Avg Latency" 
            value={
              dashboardData.decisions.avgLatency > 0
                ? `${dashboardData.decisions.avgLatency} ms`
                : '—'
            }
            delta={kpiMeta.avgLatency.delta}
            trend={kpiMeta.avgLatency.trend}
          />
          <KpiCard 
            label="Tool Calls" 
            value={dashboardData.toolCalls.total.toLocaleString()} 
            delta={kpiMeta.toolCalls.delta}
            trend={kpiMeta.toolCalls.trend}
          />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Spend Overview</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/o/${orgSlug}/spend`)}
            >
              View Spend →
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard label="Today" value={formatCurrency(dashboardData.spend.current)} />
            <KpiCard label="Last 30 Days" value={formatCurrency(dashboardData.spend.monthly)} />
          </div>
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="interactive-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Decision Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Monitor AI governance decisions in real-time</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/o/${orgSlug}/decisions`)}
              >
                View Decisions →
              </Button>
            </CardContent>
          </Card>
          
          <Card className="interactive-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">API Keys & Websockets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Manage websockets and API keys for precheck/postcheck</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/o/${orgSlug}/keys`)}
              >
                Manage Keys →
              </Button>
            </CardContent>
          </Card>
          
          {canAccessAdmin() && (
            <Card className="interactive-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Admin Panel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Configure policies, decisions, and tool calls</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push(`/o/${orgSlug}/admin`)}
                >
                  Admin Panel →
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Decisions</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Filters</Button>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </div>
          
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Timestamp</DataTableHead>
                <DataTableHead>Model</DataTableHead>
                <DataTableHead>Decision</DataTableHead>
                <DataTableHead>Cost</DataTableHead>
                <DataTableHead>Status</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {dashboardData.recentDecisions.length === 0 ? (
                <DataTableRow>
                  <DataTableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No recent decisions found
                  </DataTableCell>
                </DataTableRow>
              ) : (
                dashboardData.recentDecisions.slice(0, 5).map((decision, index) => (
                  <DataTableRow key={decision.id || index}>
                    <DataTableCell className="text-sm text-muted-foreground">
                      {new Date(decision.ts).toLocaleString()}
                    </DataTableCell>
                    <DataTableCell>{decision.tool || 'N/A'}</DataTableCell>
                    <DataTableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        decision.decision === 'allow' 
                          ? 'bg-success/10 text-success' 
                          : decision.decision === 'deny'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {decision.decision?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      {typeof decision.cost === 'number'
                        ? formatCurrency(decision.cost)
                        : '—'}
                    </DataTableCell>
                    <DataTableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        decision.decision === 'allow' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-danger/10 text-danger'
                      }`}>
                        {decision.decision === 'allow' ? 'Success' : 'Blocked'}
                      </span>
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </PlatformShell>
  );
}
