'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Badge,
  Input
} from '@governs-ai/ui';
import PlatformShell from '@/components/platform-shell';
import { 
  Plus,
  Trash2,
  Key,
  Calendar,
  Activity,
  Shield,
} from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  scopes: string[];
  isActive: boolean;
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string | null;
  // Optional fields returned by API
  keyPreview?: string;
  updatedAt?: string;
}

export default function KeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFullKey, setNewFullKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState<string | null>(null);
  const params = useParams();
  const orgSlug = params.slug as string;
  // Fixed values for precheck integration
  const PRECHECK_BASE = 'http://localhost:8080';
  const PRECHECK_USER_ID = 'cmfzriaip0000fyp81gjfkri9';
  const DEFAULT_API_KEY = 'gov_key_73a082a0cba066729f73a8240fff5ab80ab14afb90731c131a432163851eb36e';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    scopes: [] as string[],
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/api-keys`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        setError('Failed to load API keys');
        return;
      }

      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create API key');
        return;
      }

      const data = await response.json();
      // Show full key to user for copy (only available on creation)
      if (data?.key?.fullKey) {
        setNewFullKey(data.key.fullKey);
        setNewKeyName(data.key.name || 'New API Key');
      }
      // Add the masked/preview version into the table
      setApiKeys(prev => [data.key, ...prev]);
      setShowCreateForm(false);
      setFormData({ 
        name: '', 
        scopes: [] 
      });
    } catch (err) {
      console.error('Failed to create API key:', err);
      setError('Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        setError('Failed to update API key');
        return;
      }

      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, isActive } : key
      ));
    } catch (err) {
      console.error('Failed to update API key:', err);
      setError('Failed to update API key');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        setError('Failed to delete API key');
        return;
      }

      setApiKeys(prev => prev.filter(key => key.id !== keyId));
    } catch (err) {
      console.error('Failed to delete API key:', err);
      setError('Failed to delete API key');
    }
  };

  if (loading && apiKeys.length === 0) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading API keys...</p>
          </div>
        </div>
      </PlatformShell>
    );
  }

  const activeKeys = apiKeys.filter(key => key.isActive);
  const inactiveKeys = apiKeys.filter(key => !key.isActive);

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        {/* Show full key banner after creation */}
        {newFullKey && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-amber-900">Save this API key now</div>
                <div className="mt-1 text-sm text-amber-800">
                  This is the only time you can view the full value of <span className="font-semibold">{newKeyName}</span>.
                </div>
                <div className="mt-3">
                  <code className="inline-block break-all rounded bg-white px-2 py-1 text-sm text-amber-900">
                    {newFullKey}
                  </code>
                </div>
                {/* Show precheck URL with new key */}
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-amber-900">Precheck URL with this key</div>
                  <div className="flex flex-col gap-2">
                    <code className="inline-block break-all rounded bg-white px-2 py-1 text-sm text-amber-900">
                      {`${PRECHECK_BASE}/v1/u/${PRECHECK_USER_ID}/precheck`}
                    </code>
                    <div className="text-xs text-amber-800">
                      With header: <code className="bg-white px-1 py-0.5 rounded">X-Governs-Key: {newFullKey}</code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `${PRECHECK_BASE}/v1/u/${PRECHECK_USER_ID}/precheck`;
                        const header = `X-Governs-Key: ${newFullKey}`;
                        navigator.clipboard.writeText(`URL: ${url}\nHeader: ${header}`);
                      }}
                    >
                      Copy Both
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(newFullKey)}
                >
                  Copy
                </Button>
                <Button
                  onClick={() => { setNewFullKey(null); setNewKeyName(null); }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}
        <PageHeader
          title="API Keys"
          subtitle={`Manage API keys for ${orgSlug} organization`}
          actions={
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showCreateForm ? 'Cancel' : 'Create Key'}
            </Button>
          }
        />

        {/* Precheck Integration Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Precheck Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Use these values to integrate your agent with the Precheck service.
              </div>
              
              {/* Base URL */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Base URL</div>
                <div className="flex items-center gap-2">
                  <code className="inline-block break-all rounded bg-muted px-2 py-1 text-sm">
                    {PRECHECK_BASE}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(PRECHECK_BASE)}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {/* User ID */}
              <div className="space-y-2">
                <div className="text-sm font-medium">User ID</div>
                <div className="flex items-center gap-2">
                  <code className="inline-block break-all rounded bg-muted px-2 py-1 text-sm">
                    {PRECHECK_USER_ID}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(PRECHECK_USER_ID)}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {/* Default API Key */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Default API Key</div>
                <div className="flex items-center gap-2">
                  <code className="inline-block break-all rounded bg-muted px-2 py-1 text-sm">
                    {DEFAULT_API_KEY}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(DEFAULT_API_KEY)}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {/* Full URL with Header Auth */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Full URL (Header Auth - Recommended)</div>
                <div className="flex flex-col gap-2">
                  <code className="inline-block break-all rounded bg-muted px-2 py-1 text-sm">
                    {`${PRECHECK_BASE}/v1/u/${PRECHECK_USER_ID}/precheck`}
                  </code>
                  <div className="text-sm text-muted-foreground">
                    With header: <code className="bg-muted px-1 py-0.5 rounded">X-Governs-Key: {DEFAULT_API_KEY}</code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${PRECHECK_BASE}/v1/u/${PRECHECK_USER_ID}/precheck`;
                      const header = `X-Governs-Key: ${DEFAULT_API_KEY}`;
                      navigator.clipboard.writeText(`URL: ${url}\nHeader: ${header}`);
                    }}
                  >
                    Copy Both
                  </Button>
                </div>
              </div>

              {/* Full URL with Query Auth */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Full URL (Query Auth - Alternative)</div>
                <div className="flex items-center gap-2">
                  <code className="inline-block break-all rounded bg-muted px-2 py-1 text-sm">
                    {`${PRECHECK_BASE}/v1/u/${PRECHECK_USER_ID}/precheck?api_key=${DEFAULT_API_KEY}`}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(`${PRECHECK_BASE}/v1/u/${PRECHECK_USER_ID}/precheck?api_key=${DEFAULT_API_KEY}`)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Total Keys" value={apiKeys.length.toString()} />
          <KpiCard label="Active Keys" value={activeKeys.length.toString()} />
          <KpiCard label="Inactive Keys" value={inactiveKeys.length.toString()} />
          <KpiCard label="Recently Used" value={apiKeys.filter(key => key.lastUsed && new Date(key.lastUsed) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length.toString()} />
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New API Key</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Key Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My API Key"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Scopes</label>
                  <div className="space-y-2">
                    {['decisions', 'approvals', 'dlq', 'toolcalls', 'usage'].map((scope) => (
                      <label key={scope} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.scopes.includes(scope)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, scopes: [...prev.scopes, scope] }));
                            } else {
                              setFormData(prev => ({ ...prev, scopes: prev.scopes.filter(s => s !== scope) }));
                            }
                          }}
                          className="rounded border-border"
                        />
                        <span className="text-sm">{scope}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Key'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}

        {/* API Keys Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">API Keys</h2>
            <div className="text-sm text-muted-foreground">
              {apiKeys.length} total, {activeKeys.length} active
            </div>
          </div>
          
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Name</DataTableHead>
                <DataTableHead>Scopes</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>Last Used</DataTableHead>
                <DataTableHead>Created</DataTableHead>
                <DataTableHead>Actions</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {apiKeys.map((key) => (
                <DataTableRow key={key.id}>
                  <DataTableCell>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{key.name}</span>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={key.isActive ? 'default' : 'secondary'}>
                      {key.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleKey(key.id, !key.isActive)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </section>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Key Scopes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>decisions:</strong> Access to decision events and analytics</p>
              <p><strong>approvals:</strong> Manage approval workflows and policies</p>
              <p><strong>dlq:</strong> Access to dead letter queue and error handling</p>
              <p><strong>toolcalls:</strong> Monitor and manage tool call usage</p>
              <p><strong>usage:</strong> View usage statistics and billing information</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}