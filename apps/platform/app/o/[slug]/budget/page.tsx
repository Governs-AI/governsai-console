'use client';

import { useState, useEffect } from 'react';
import { BudgetStatus } from '@/components/budget-status';
import PlatformShell from '@/components/platform-shell';
import { useOrgReady } from '@/lib/use-org-ready';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, AlertTriangle, DollarSign, Users, Building } from 'lucide-react';

interface BudgetLimit {
  id: string;
  type: string;
  userId?: string;
  userName?: string;
  monthlyLimit: number;
  alertAt?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BudgetAlert {
  id: string;
  type: string;
  message: string;
  threshold?: number;
  isRead: boolean;
  createdAt: string;
}

export default function BudgetPage({ params }: { params: { slug: string } }) {
  const orgSlug = params.slug;
  const { org, isReady, loading: orgLoading } = useOrgReady(orgSlug);
  const [limits, setLimits] = useState<BudgetLimit[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState({ 
    type: 'organization', 
    monthlyLimit: '', 
    alertAt: '',
    userId: ''
  });
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState({
    budgetEnabled: true,
    budgetOnError: 'block'
  });

  async function fetchLimits() {
    try {
      const res = await fetch(`/api/v1/budget/limits?orgId=${orgSlug}`);
      if (!res.ok) throw new Error('Failed to fetch budget limits');
      const data = await res.json();
      setLimits(data.limits);
    } catch (err) {
      console.error('Error fetching limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch budget limits');
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fetch(`/api/v1/budget/alerts?orgId=${orgSlug}&unreadOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch(`/api/v1/budget/settings?orgId=${orgSlug}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }

  async function updateSettings() {
    try {
      const res = await fetch('/api/v1/budget/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: orgSlug,
          ...settings,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      setError(null);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  }

  async function createLimit() {
    if (!newLimit.monthlyLimit) {
      setError('Monthly limit is required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/v1/budget/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: orgSlug,
          type: newLimit.type,
          userId: newLimit.type === 'user' ? newLimit.userId : undefined,
          monthlyLimit: parseFloat(newLimit.monthlyLimit),
          alertAt: newLimit.alertAt ? parseFloat(newLimit.alertAt) : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create budget limit');
      }

      // Reset form and refresh
      setNewLimit({ type: 'organization', monthlyLimit: '', alertAt: '', userId: '' });
      await fetchLimits();
      setError(null);
    } catch (err) {
      console.error('Error creating limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to create budget limit');
    } finally {
      setCreating(false);
    }
  }

  async function deleteLimit(limitId: string) {
    try {
      const res = await fetch(`/api/v1/budget/limits/${limitId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete budget limit');
      }

      await fetchLimits();
    } catch (err) {
      console.error('Error deleting limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete budget limit');
    }
  }

  async function markAlertAsRead(alertId: string) {
    try {
      await fetch('/api/v1/budget/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });

      await fetchAlerts();
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  }

  useEffect(() => {
    if (!isReady) return;
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchLimits(), fetchAlerts(), fetchSettings()]);
      setLoading(false);
    }
    loadData();
  }, [isReady, org?.id, orgSlug]);

  if (!orgLoading && !org) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Organization not found.</p>
        </div>
      </PlatformShell>
    );
  }

  if (loading) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Budget Management</h1>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Budget Management</h1>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetStatus orgId={org?.id ?? orgSlug} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent alerts</p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAlertAsRead(alert.id)}
                    >
                      Mark Read
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="budgetEnabled">Enable Budget Tracking</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, budget limits will be enforced for all AI requests
              </p>
            </div>
            <input
              id="budgetEnabled"
              type="checkbox"
              checked={settings.budgetEnabled}
              onChange={(e) => setSettings({ ...settings, budgetEnabled: e.target.checked })}
              className="h-4 w-4"
            />
          </div>

          <div>
            <Label htmlFor="budgetOnError">Error Handling</Label>
            <Select
              value={settings.budgetOnError}
              onValueChange={(value) => setSettings({ ...settings, budgetOnError: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">
                  Block requests when budget check fails
                </SelectItem>
                <SelectItem value="pass">
                  Allow requests when budget check fails
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how to handle requests when budget validation fails
            </p>
          </div>

          <Button onClick={updateSettings}>
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Budget Limit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={newLimit.type}
                onValueChange={(value) => setNewLimit({ ...newLimit, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Organization
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      User
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newLimit.type === 'user' && (
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={newLimit.userId}
                  onChange={(e) => setNewLimit({ ...newLimit, userId: e.target.value })}
                  placeholder="Enter user ID"
                />
              </div>
            )}

            <div>
              <Label htmlFor="monthlyLimit">Monthly Limit ($)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                step="0.01"
                value={newLimit.monthlyLimit}
                onChange={(e) => setNewLimit({ ...newLimit, monthlyLimit: e.target.value })}
                placeholder="500.00"
              />
            </div>

            <div>
              <Label htmlFor="alertAt">Alert At ($)</Label>
              <Input
                id="alertAt"
                type="number"
                step="0.01"
                value={newLimit.alertAt}
                onChange={(e) => setNewLimit({ ...newLimit, alertAt: e.target.value })}
                placeholder="400.00"
              />
            </div>
          </div>

          <Button onClick={createLimit} disabled={creating}>
            {creating ? 'Creating...' : 'Create Limit'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Active Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {limits.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No budget limits configured</p>
          ) : (
            <div className="space-y-4">
              {limits.map((limit) => (
                <div
                  key={limit.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {limit.type === 'organization' ? (
                        <Building className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {limit.type === 'organization' ? 'Organization' : limit.userName || 'User'}
                      </span>
                      {!limit.isActive && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Limit: ${limit.monthlyLimit.toFixed(2)}
                      {limit.alertAt && ` • Alert at: $${limit.alertAt.toFixed(2)}`}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteLimit(limit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PlatformShell>
  );
}
