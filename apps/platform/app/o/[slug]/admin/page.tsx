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
  LoadingSpinner,
  Badge
} from '@governs-ai/ui';
import PlatformShell from '@/components/platform-shell';
import { 
  Settings, 
  Shield, 
  Activity, 
  Users, 
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

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

export default function AdminPage() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
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

  // Check if user has admin/owner role
  const currentOrg = organizations.find(org => org.slug === orgSlug);
  const isAdmin = currentOrg?.role === 'OWNER' || currentOrg?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <PlatformShell>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You need admin privileges to access this page.
            </p>
            <Button onClick={() => router.push(`/o/${orgSlug}/dashboard`)}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title="Admin Panel"
          subtitle={`Manage policies, decisions, and tool calls for ${orgSlug}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/o/${orgSlug}/dashboard`)}>
                Back to Dashboard
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Policy
              </Button>
            </div>
          }
        />
        
        {/* Admin KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Active Policies" value="12" delta="+2" trend="up" />
          <KpiCard label="Total Decisions" value="1,204,332" delta="+3.1%" trend="up" />
          <KpiCard label="Block Rate" value="7.6%" delta="-0.7%" trend="down" />
          <KpiCard label="Org Members" value="8" delta="+1" trend="up" />
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policies Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PII Detection</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cost Limits</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tool Restrictions</span>
                  <Badge variant="secondary">Draft</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Policy
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Members Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{user?.name || user?.email}</p>
                    <p className="text-xs text-muted-foreground">You</p>
                  </div>
                  <Badge variant="default">OWNER</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">john.doe@company.com</p>
                    <p className="text-xs text-muted-foreground">Developer</p>
                  </div>
                  <Badge variant="secondary">DEVELOPER</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Decisions Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Decisions</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Filters</Button>
              <Button variant="ghost" size="sm">Export</Button>
            </div>
          </div>
          
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Timestamp</DataTableHead>
                <DataTableHead>User</DataTableHead>
                <DataTableHead>Tool</DataTableHead>
                <DataTableHead>Decision</DataTableHead>
                <DataTableHead>Policy</DataTableHead>
                <DataTableHead>Actions</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">2 min ago</DataTableCell>
                <DataTableCell>john.doe@company.com</DataTableCell>
                <DataTableCell>web.fetch</DataTableCell>
                <DataTableCell>
                  <Badge variant="default">ALLOW</Badge>
                </DataTableCell>
                <DataTableCell>PII Detection</DataTableCell>
                <DataTableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">5 min ago</DataTableCell>
                <DataTableCell>jane.smith@company.com</DataTableCell>
                <DataTableCell>file.read</DataTableCell>
                <DataTableCell>
                  <Badge variant="destructive">BLOCK</Badge>
                </DataTableCell>
                <DataTableCell>Cost Limits</DataTableCell>
                <DataTableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </PlatformShell>
  );
}
