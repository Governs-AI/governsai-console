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
  CheckCircle,
  Edit,
  Copy,
  Power,
  PowerOff
} from 'lucide-react';
import { PolicyForm } from './policy-form';
import { useRoleCheck } from './role-guard';
import { useOrgReady } from '@/lib/use-org-ready';

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
  const { canManagePolicies } = useRoleCheck();
  const { org, isReady, loading: orgLoading } = useOrgReady(orgSlug);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
  

  // Fetch policies and tools
  useEffect(() => {
    if (!isReady || !org) return;
    fetchData(org.id);
    const interval = setInterval(() => fetchData(org.id), 30000);
    return () => clearInterval(interval);
  }, [orgSlug, isReady, org?.id]);

  // Filter policies based on search term
  const filteredPolicies = policies.filter(policy =>
    policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = async (orgId?: string) => {
    if (!loading) setRefreshing(true);
    await Promise.all([fetchPolicies(orgId), fetchTools()]);
    if (refreshing) setRefreshing(false);
  };

  const fetchPolicies = async (orgIdParam?: string) => {
    try {
      const actualOrgId = orgIdParam || org?.id;
      if (!actualOrgId) {
        console.error('No orgId available for fetching policies');
        return;
      }
      const response = await fetch(`/api/v1/policies?orgId=${actualOrgId}`);
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setError('Failed to fetch policies');
    }
  };

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/v1/tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      setError('Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (policyData: any) => {
    try {
      if (!org?.id) {
        setError('Organization not found');
        setTimeout(() => setError(null), 5000);
        return;
      }

      const payload = {
        ...policyData,
        orgId: org.id,
      };

      let response;
      if (editingPolicy) {
        // Update existing policy
        response = await fetch(`/api/v1/policies/${editingPolicy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new policy
        response = await fetch('/api/v1/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await fetchPolicies();
        setIsCreating(false);
        setEditingPolicy(null);
        setSuccess(editingPolicy ? 'Policy updated successfully' : 'Policy created successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save policy');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      setError('Failed to save policy');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    setIsCreating(false);
  };

  const handleDuplicatePolicy = async (policy: Policy) => {
    const duplicateData = {
      ...policy,
      name: `${policy.name} (Copy)`,
      id: undefined,
    };
    setEditingPolicy(duplicateData as any);
    setIsCreating(false);
  };

  const togglePolicyStatus = async (policyId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await fetchPolicies();
        setSuccess(`Policy ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update policy status');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Error updating policy status:', error);
      setError('Failed to update policy status');
      setTimeout(() => setError(null), 5000);
    }
  };

  const deletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const response = await fetch(`/api/v1/policies/${policyId}`, {
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

  if (!orgLoading && !org) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Organization not found.
      </div>
    );
  }

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
        subtitle={
          canManagePolicies() 
            ? `Manage and monitor governance policies for ${orgSlug}`
            : `View your personal policies and organization policies for ${orgSlug}`
        }
        actions={
          canManagePolicies() ? (
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
          ) : (
            <Button
              onClick={fetchData}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )
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

      {/* Policy Priority Information for VIEWER users */}
      {!canManagePolicies() && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Policy Priority System</h3>
                <div className="mt-2 text-sm text-gray-600">
                  <p className="mb-2">
                    <strong>Organization policies</strong> take priority over your personal policies.
                  </p>
                  <p className="mb-2">
                    When both organization and personal policies exist for the same tool or action, 
                    the organization policy will be enforced.
                  </p>
                  <p>
                    You can create personal policies to customize your experience, but they won't 
                    override organization-wide security settings.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Policy Form (Create/Edit) */}
      {(isCreating || editingPolicy) && (
        <PolicyForm
          policy={editingPolicy ? {
            ...editingPolicy,
            description: editingPolicy.description || '',
          } : undefined}
          orgSlug={orgSlug}
          availableTools={tools}
          onSave={handleSavePolicy}
          onCancel={() => {
            setIsCreating(false);
            setEditingPolicy(null);
          }}
        />
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
                          {policy.denyTools.length > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs text-red-600">🚫 {policy.denyTools.length} blocked tools</span>
                              <div className="flex gap-1">
                                {policy.denyTools.slice(0, 3).map((tool) => (
                                  <span key={tool} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                    {tool}
                                  </span>
                                ))}
                                {policy.denyTools.length > 3 && (
                                  <span className="text-xs text-red-500">+{policy.denyTools.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
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
                        <div className="flex gap-1">
                          {canManagePolicies() ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPolicy(policy)}
                                title="Edit policy"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicatePolicy(policy)}
                                title="Duplicate policy"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => togglePolicyStatus(policy.id, policy.isActive)}
                                title={policy.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {policy.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deletePolicy(policy.id)}
                                title="Delete policy"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">View Only</span>
                          )}
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
                              <div className="border-l-4 border-red-200 pl-3">
                                <span className="font-medium text-sm text-red-800">🚫 Blocked Tools ({policy.denyTools.length}):</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {policy.denyTools.map((tool) => (
                                    <Badge key={tool} variant="destructive" className="text-xs">
                                      {tool}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-xs text-red-600 mt-1">
                                  These tools will be blocked when agents try to use them
                                </p>
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
