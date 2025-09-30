'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Badge,
  LoadingSpinner,
  PageHeader
} from '@governs-ai/ui';
import {
  RefreshCw,
  Shield,
  Settings,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface Policy {
  id: string;
  name: string;
  description?: string;
  version: string;
  defaults: {
    ingress: { action: string };
    egress: { action: string };
  };
  toolAccess: Record<string, any>;
  denyTools: string[];
  allowTools: string[];
  networkScopes: string[];
  networkTools: string[];
  onError: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ToolConfig {
  id: string;
  toolName: string;
  displayName?: string;
  description?: string;
  category: string;
  riskLevel: string;
  scope: string;
  direction: string;
  requiresApproval: boolean;
  isActive: boolean;
}

interface PoliciesClientProps {
  orgSlug: string;
}

export function PoliciesClient({ orgSlug }: PoliciesClientProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());

  // Fetch policies and tools
  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [orgSlug]);

  // Filter policies based on search term
  const filteredPolicies = policies.filter(policy =>
    policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = async () => {
    if (!loading) setRefreshing(true);
    await Promise.all([fetchPolicies(), fetchTools()]);
    if (refreshing) setRefreshing(false);
  };

  const fetchPolicies = async () => {
    try {
      const response = await fetch(`/api/policies?orgId=${orgSlug}`);
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setError('Failed to fetch policies');
    }
  };

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      setError('Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPolicy = async () => {
    try {
      const defaultPolicy = {
        orgId: orgSlug,
        name: 'Default Demo Policy',
        description: 'Default policy for demo environment',
        version: 'v1',
        defaults: {
          ingress: { action: 'redact' },
          egress: { action: 'redact' },
        },
        toolAccess: {
          'weather.current': {
            direction: 'ingress',
            action: 'allow',
            allow_pii: {},
          },
          'weather.forecast': {
            direction: 'ingress',
            action: 'allow',
            allow_pii: {},
          },
          'email.send': {
            direction: 'egress',
            action: 'redact',
            allow_pii: {
              'PII:email_address': 'pass_through',
              'PII:us_ssn': 'tokenize',
            },
          },
        },
        denyTools: ['python.exec', 'bash.exec', 'shell.exec'],
        allowTools: [],
        networkScopes: ['net.'],
        networkTools: ['web.', 'email.', 'calendar.'],
        onError: 'block',
        priority: 0,
      };

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultPolicy),
      });

      if (response.ok) {
        await fetchPolicies();
        setIsCreating(false);
        setSuccess('Policy created successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create policy');
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      setError('Failed to create policy');
    }
  };

  const deletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPolicies();
        if (selectedPolicy?.id === policyId) {
          setSelectedPolicy(null);
        }
        setSuccess('Policy deleted successfully');
      } else {
        setError('Failed to delete policy');
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      setError('Failed to delete policy');
    }
  };

  const toggleExpanded = (policyId: string) => {
    const newExpanded = new Set(expandedPolicies);
    if (newExpanded.has(policyId)) {
      newExpanded.delete(policyId);
    } else {
      newExpanded.add(policyId);
    }
    setExpandedPolicies(newExpanded);
  };

  const getPolicyStats = () => {
    return {
      total: policies.length,
      active: policies.filter(p => p.isActive).length,
      inactive: policies.filter(p => !p.isActive).length,
      tools: tools.length
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = getPolicyStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Governance Policies"
        subtitle={`Manage and monitor governance policies for ${orgSlug}`}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreating(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
            <Button
              onClick={fetchData}
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

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Policies</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Inactive</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Tools</p>
                <p className="text-2xl font-bold text-purple-600">{stats.tools}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Policy Form */}
      {isCreating && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Create New Policy</h3>
                <p className="text-muted-foreground">Create a new policy for your organization</p>
              </div>
              <div className="flex space-x-2">
                <Button onClick={createDefaultPolicy}>
                  Create Default Policy
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies Content */}
      <div className="space-y-4">
        {/* Search */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {filteredPolicies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Policies Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No policies match your search criteria.' : 'No AI governance policies have been created yet.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Policy
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Policy</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Updated</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPolicies.map((policy) => (
                  <React.Fragment key={policy.id}>
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{policy.name}</div>
                          <div className="text-sm text-muted-foreground">{policy.description}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {policy.priority}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(policy.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)}
                          >
                            {selectedPolicy?.id === policy.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePolicy(policy.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpanded(policy.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {expandedPolicies.has(policy.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedPolicies.has(policy.id) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-muted/20">
                          <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">ID:</span> {policy.id}
                              </div>
                              <div>
                                <span className="font-medium">Version:</span> {policy.version}
                              </div>
                              <div>
                                <span className="font-medium">Created:</span> {formatDate(policy.createdAt)}
                              </div>
                              <div>
                                <span className="font-medium">On Error:</span> {policy.onError}
                              </div>
                            </div>

                            {/* Default Actions */}
                            <div>
                              <span className="font-medium text-sm">Default Actions:</span>
                              <div className="mt-1 grid grid-cols-2 gap-2">
                                <div className="flex justify-between">
                                  <span>Ingress:</span>
                                  <Badge variant="outline">{policy.defaults.ingress.action}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span>Egress:</span>
                                  <Badge variant="outline">{policy.defaults.egress.action}</Badge>
                                </div>
                              </div>
                            </div>

                            {/* Network Configuration */}
                            <div>
                              <span className="font-medium text-sm">Network Configuration:</span>
                              <div className="mt-1 space-y-1">
                                <div>
                                  <span className="text-muted-foreground">Scopes:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {policy.networkScopes.map((scope) => (
                                      <Badge key={scope} variant="outline" className="text-xs">
                                        {scope}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Tools:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {policy.networkTools.map((tool) => (
                                      <Badge key={tool} variant="outline" className="text-xs">
                                        {tool}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Denied Tools */}
                            {policy.denyTools.length > 0 && (
                              <div>
                                <span className="font-medium text-sm">Denied Tools:</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {policy.denyTools.map((tool) => (
                                    <Badge key={tool} variant="destructive" className="text-xs">
                                      {tool}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Tool Access Rules */}
                            {Object.keys(policy.toolAccess).length > 0 && (
                              <div>
                                <span className="font-medium text-sm">Tool Access Rules:</span>
                                <div className="mt-1 space-y-2">
                                  {Object.entries(policy.toolAccess).map(([tool, config]) => (
                                    <div key={tool} className="flex items-center justify-between p-2 border rounded text-xs">
                                      <span className="font-mono">{tool}</span>
                                      <div className="flex gap-2">
                                        <Badge variant="outline">{config.direction}</Badge>
                                        <Badge variant="outline">{config.action}</Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
