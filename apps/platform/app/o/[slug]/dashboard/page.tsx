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

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userRole, canAccessAdmin, canManageUsers, canViewSpend } = useRoleCheck();
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

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/v1/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        setError('Failed to load user data');
        router.push('/auth/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setOrganizations(data.organizations || []);
      
      // Find the current organization
      const currentOrg = data.organizations.find((org: any) => org.slug === orgSlug);
      if (currentOrg) {
        await fetchDashboardData(currentOrg.id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const fetchDashboardData = async (orgId: string) => {
    try {
      // Fetch decisions data
      const decisionsResponse = await fetch(`/api/v1/decisions?orgId=${orgId}&includeStats=true&limit=10`, {
        credentials: 'include',
      });
      
      // Fetch tool calls data
      const toolCallsResponse = await fetch(`/api/v1/toolcalls?orgId=${orgId}&includeStats=true&limit=10`, {
        credentials: 'include',
      });

      const [decisionsData, toolCallsData] = await Promise.all([
        decisionsResponse.ok ? decisionsResponse.json() : { decisions: [], stats: null },
        toolCallsResponse.ok ? toolCallsResponse.json() : { toolcalls: [], stats: null }
      ]);

      setDashboardData({
        decisions: {
          total: decisionsData.stats?.total || 0,
          allowed: decisionsData.stats?.byDecision?.allow || 0,
          denied: decisionsData.stats?.byDecision?.deny || 0,
          avgLatency: 0 // This would need to be calculated from the data
        },
        toolCalls: {
          total: toolCallsData.stats?.total || 0,
          byTool: toolCallsData.stats?.byTool || {}
        },
        recentDecisions: decisionsData.decisions || [],
        spend: {
          current: 0, // This would need a separate API
          monthly: 0
        }
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      // Don't set error here, just use default values
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => router.push('/auth/login')}>
            Go to Login
          </Button>
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
            delta="+3.1%" 
            trend="up" 
          />
          <KpiCard 
            label="Allow Rate" 
            value={dashboardData.decisions.total > 0 
              ? `${((dashboardData.decisions.allowed / dashboardData.decisions.total) * 100).toFixed(1)}%` 
              : "0%"
            } 
            delta="+0.7%" 
            trend="up" 
          />
          <KpiCard 
            label="Avg Latency" 
            value={`${dashboardData.decisions.avgLatency} ms`} 
            delta="-12 ms" 
            trend="down" 
          />
          <KpiCard 
            label="Tool Calls" 
            value={dashboardData.toolCalls.total.toLocaleString()} 
            delta="+5.2%" 
            trend="up" 
          />
        </div>

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
                    <DataTableCell>$0.00</DataTableCell>
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
