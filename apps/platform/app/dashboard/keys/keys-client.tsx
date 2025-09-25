"use client";

import { useState, useEffect } from 'react';
import { 
  PageHeader, 
  Button, 
  Input, 
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
  EmptyState,
  Skeleton,
  SkeletonRow
} from "@governs-ai/ui";

interface APIKey {
  id: string;
  label: string;
  scopes: string[];
  issuedAt: string;
  lastUsed: string | null;
  isActive: boolean;
  keyValue?: string;
}

export default function KeysClient() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState({
    label: '',
    scopes: [] as string[],
  });
  const [createdKey, setCreatedKey] = useState<APIKey | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/keys?orgId=default-org');
      const data = await response.json();
      setKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async () => {
    try {
      const response = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newKey.label,
          scopes: newKey.scopes,
          orgId: 'default-org',
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setCreatedKey(created);
        setNewKey({ label: '', scopes: [] });
        setShowCreateForm(false);
        fetchKeys();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/v1/keys/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchKeys();
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastUsed = (lastUsed: string | null) => {
    if (!lastUsed) return 'Never';
    return new Date(lastUsed).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Manage your API keys for accessing GovernsAI services"
        actions={
          <Button onClick={() => setShowCreateForm(true)}>
            Create Key
          </Button>
        }
      />

      {/* Create Key Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Label
              </label>
              <Input
                type="text"
                placeholder="e.g., Production API Key"
                value={newKey.label}
                onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Scopes
              </label>
              <div className="space-y-2">
                {['precheck:invoke', 'ingest:write', 'policy:publish'].map((scope) => (
                  <label key={scope} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newKey.scopes.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKey({ ...newKey, scopes: [...newKey.scopes, scope] });
                        } else {
                          setNewKey({ ...newKey, scopes: newKey.scopes.filter(s => s !== scope) });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{scope}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateKey}
                disabled={!newKey.label || newKey.scopes.length === 0}
              >
                Create Key
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created Key Display */}
      {createdKey && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="text-warning">API Key Created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-background p-4 rounded border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Key Value</span>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(createdKey.keyValue || '')}
                >
                  Copy
                </Button>
              </div>
              <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                {createdKey.keyValue}
              </p>
            </div>
            <p className="text-sm text-warning">
              ⚠️ This is the only time you'll see the full key value. Make sure to copy it now.
            </p>
            <Button 
              onClick={() => setCreatedKey(null)}
              className="bg-warning hover:bg-warning/90"
            >
              I've Saved the Key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Keys Table */}
      {keys.length === 0 ? (
        <EmptyState
          title="No API keys found"
          desc="Create your first key to get started with the GovernsAI API."
          action={
            <Button onClick={() => setShowCreateForm(true)}>
              Create First Key
            </Button>
          }
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead>Label</DataTableHead>
              <DataTableHead>Scopes</DataTableHead>
              <DataTableHead>Issued</DataTableHead>
              <DataTableHead>Last Used</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Actions</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {keys.map((key) => (
              <DataTableRow key={key.id}>
                <DataTableCell className="font-medium">
                  {key.label}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map((scope) => (
                      <span key={scope} className="inline-flex px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded">
                        {scope}
                      </span>
                    ))}
                  </div>
                </DataTableCell>
                <DataTableCell className="text-sm text-muted-foreground">
                  {formatDate(key.issuedAt)}
                </DataTableCell>
                <DataTableCell className="text-sm text-muted-foreground">
                  {formatLastUsed(key.lastUsed)}
                </DataTableCell>
                <DataTableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    key.isActive 
                      ? 'text-success bg-success/10' 
                      : 'text-muted-foreground bg-muted'
                  }`}>
                    {key.isActive ? 'Active' : 'Inactive'}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteKey(key.id)}
                    className="text-danger hover:text-danger"
                  >
                    Delete
                  </Button>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}