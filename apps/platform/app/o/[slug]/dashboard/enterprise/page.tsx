'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  KpiCard, 
  PageHeader, 
  Button, 
  DataTable, 
  DataTableHeader, 
  DataTableBody, 
  DataTableRow, 
  DataTableHead, 
  DataTableCell,
  EmptyState,
  SkeletonCard
} from '@governs-ai/ui';
import { 
  Download, 
  RefreshCw, 
  Filter, 
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  DollarSign,
  Clock
} from 'lucide-react';

export default function EnterpriseDashboard() {
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const orgSlug = params.slug as string;

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => setLoading(false), 1000);
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting data...');
  };

  // Mock data - in real app, this would come from API
  const kpiData = [
    {
      label: "Total decisions",
      value: "1,204,332",
      delta: "+3.1%",
      trend: "up" as const
    },
    {
      label: "Allow rate",
      value: "92.4%",
      delta: "+0.7%",
      trend: "up" as const
    },
    {
      label: "Avg latency",
      value: "178 ms",
      delta: "-12 ms",
      trend: "down" as const
    },
    {
      label: "Spend (MTD)",
      value: "$4,230",
      delta: "+$120",
      trend: "up" as const
    }
  ];

  const recentDecisions = [
    {
      id: "dec_001",
      timestamp: "2024-12-19 10:30:15",
      tool: "web.fetch",
      decision: "allow",
      latency: "142ms",
      orgId: "acme-inc"
    },
    {
      id: "dec_002", 
      timestamp: "2024-12-19 10:29:42",
      tool: "file.read",
      decision: "deny",
      latency: "89ms",
      orgId: "acme-inc"
    },
    {
      id: "dec_003",
      timestamp: "2024-12-19 10:29:18",
      tool: "web.fetch",
      decision: "allow",
      latency: "156ms",
      orgId: "acme-inc"
    },
    {
      id: "dec_004",
      timestamp: "2024-12-19 10:28:55",
      tool: "database.query",
      decision: "transform",
      latency: "203ms",
      orgId: "acme-inc"
    }
  ];

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'allow': return 'text-success';
      case 'deny': return 'text-danger';
      case 'transform': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'allow': return <Shield className="h-4 w-4" />;
      case 'deny': return <Activity className="h-4 w-4" />;
      case 'transform': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Real-time view of policy decisions, spend, and approvals."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <KpiCard
            key={index}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* Recent Decisions Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent decisions</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead>ID</DataTableHead>
              <DataTableHead>Timestamp</DataTableHead>
              <DataTableHead>Tool</DataTableHead>
              <DataTableHead>Decision</DataTableHead>
              <DataTableHead>Latency</DataTableHead>
              <DataTableHead>Org</DataTableHead>
              <DataTableHead className="w-12"></DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {recentDecisions.map((decision) => (
              <DataTableRow key={decision.id}>
                <DataTableCell className="font-mono text-xs">
                  {decision.id}
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {decision.timestamp}
                </DataTableCell>
                <DataTableCell className="font-medium">
                  {decision.tool}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex items-center gap-2">
                    {getDecisionIcon(decision.decision)}
                    <span className={getDecisionColor(decision.decision)}>
                      {decision.decision}
                    </span>
                  </div>
                </DataTableCell>
                <DataTableCell className="font-mono text-xs">
                  {decision.latency}
                </DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                    {decision.orgId}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </section>

      {/* Additional sections can be added here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend Overview */}
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Spend Overview</h3>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-enterprise-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Monthly Spend</span>
              </div>
              <span className="text-2xl font-bold">$4,230</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">OpenAI</span>
                <span>$2,840</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Anthropic</span>
                <span>$1,390</span>
              </div>
            </div>
          </div>
        </section>

        {/* Policy Status */}
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Policy Status</h3>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-enterprise-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand" />
                <span className="text-sm font-medium">Active Policies</span>
              </div>
              <span className="text-2xl font-bold">12</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PII Detection</span>
                <span className="text-success">Enabled</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost Limits</span>
                <span className="text-success">Enabled</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
