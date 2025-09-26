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
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.slug as string;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/profile', {
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
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
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
          <KpiCard label="Total Decisions" value="1,204,332" delta="+3.1%" trend="up" />
          <KpiCard label="Allow Rate" value="92.4%" delta="+0.7%" trend="up" />
          <KpiCard label="Avg Latency" value="178 ms" delta="-12 ms" trend="down" />
          <KpiCard label="Spend (MTD)" value="$4,230" delta="+$120" trend="up" />
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
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">2 min ago</DataTableCell>
                <DataTableCell>gpt-4</DataTableCell>
                <DataTableCell>ALLOW</DataTableCell>
                <DataTableCell>$0.02</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    Success
                  </span>
                </DataTableCell>
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">5 min ago</DataTableCell>
                <DataTableCell>claude-3</DataTableCell>
                <DataTableCell>BLOCK</DataTableCell>
                <DataTableCell>$0.00</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger/10 text-danger">
                    Blocked
                  </span>
                </DataTableCell>
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">8 min ago</DataTableCell>
                <DataTableCell>gpt-3.5-turbo</DataTableCell>
                <DataTableCell>ALLOW</DataTableCell>
                <DataTableCell>$0.01</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    Success
                  </span>
                </DataTableCell>
              </DataTableRow>
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </PlatformShell>
  );
}
