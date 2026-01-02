'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  LoadingSpinner,
  PageHeader
} from '@governs-ai/ui';
import {
  RefreshCw,
  Shield,
  Activity,
  Clock,
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
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';

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

interface AuditDecision {
  id: string;
  ts: string;
  decision: string;
  direction?: string;
  tool?: string | null;
  policyId?: string | null;
  latencyMs?: number | null;
  correlationId?: string | null;
}

interface PoliciesClientProps {
  orgSlug: string;
}

export function PoliciesClient({ orgSlug }: PoliciesClientProps) {
  const router = useRouter();
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
  const [activeView, setActiveView] = useState<'define' | 'audit'>('define');
  const [auditDecisions, setAuditDecisions] = useState<AuditDecision[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilters, setAuditFilters] = useState({
    timeRange: '7d',
    decision: 'all',
    direction: 'all',
    policyId: 'all',
  });
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
  

  // Fetch policies and tools
  useEffect(() => {
    if (!isReady || !org) return;
    fetchData(org.id);
    const interval = setInterval(() => fetchData(org.id), 30000);
    return () => clearInterval(interval);
  }, [orgSlug, isReady, org?.id]);

  useEffect(() => {
    if (!isReady || !org || activeView !== 'audit') return;
    fetchAuditData();
  }, [
    activeView,
    isReady,
    org?.id,
    auditFilters.timeRange,
    auditFilters.decision,
    auditFilters.direction,
    auditFilters.policyId,
  ]);

  const filteredPolicies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return policies;
    return policies.filter(policy =>
      policy.name.toLowerCase().includes(term) ||
      policy.description?.toLowerCase().includes(term) ||
      policy.version.toLowerCase().includes(term)
    );
  }, [policies, searchTerm]);

  const policyLookup = useMemo(
    () => new Map(policies.map((policy) => [policy.id, policy])),
    [policies]
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
      const response = await fetch('/api/v1/policies?includeInactive=true', {
        credentials: 'include',
      });
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

  const getTimeRangeStart = (timeRange: string) => {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const fetchAuditData = async () => {
    if (!org?.id) return;

    setAuditLoading(true);
    setAuditError(null);

    try {
      const now = new Date();
      const startTime = getTimeRangeStart(auditFilters.timeRange);
      const params = new URLSearchParams({
        includeStats: 'true',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        limit: '200',
      });

      if (auditFilters.decision !== 'all') {
        params.set('decision', auditFilters.decision);
      }
      if (auditFilters.direction !== 'all') {
        params.set('direction', auditFilters.direction);
      }
      if (auditFilters.policyId !== 'all' && auditFilters.policyId !== 'unassigned') {
        params.set('policyId', auditFilters.policyId);
      }

      const response = await fetch(`/api/v1/decisions?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch policy audit log');
      }

      const data = await response.json();
      setAuditDecisions(data.decisions || []);
    } catch (err) {
      console.error('Error fetching policy audit log:', err);
      setAuditError('Failed to load policy audit log');
    } finally {
      setAuditLoading(false);
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

      const isEditingExisting = Boolean(editingPolicy?.id);
      let response;
      if (isEditingExisting) {
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
        setSuccess(isEditingExisting ? 'Policy updated successfully' : 'Policy created successfully');
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

  const auditFilteredDecisions = useMemo(() => {
    const term = auditSearch.trim().toLowerCase();
    return auditDecisions.filter((decision) => {
      if (auditFilters.policyId === 'unassigned' && decision.policyId) {
        return false;
      }
      if (auditFilters.policyId !== 'all' && auditFilters.policyId !== 'unassigned') {
        if (decision.policyId !== auditFilters.policyId) {
          return false;
        }
      }
      if (!term) return true;
      return (
        decision.policyId?.toLowerCase().includes(term) ||
        decision.tool?.toLowerCase().includes(term) ||
        decision.decision?.toLowerCase().includes(term) ||
        decision.correlationId?.toLowerCase().includes(term)
      );
    });
  }, [auditDecisions, auditFilters.policyId, auditSearch]);

  const auditSummary = useMemo(() => {
    const total = auditFilteredDecisions.length;
    const denied = auditFilteredDecisions.filter((d) => d.decision === 'deny').length;
    const allowed = auditFilteredDecisions.filter((d) => d.decision === 'allow').length;
    const transformed = auditFilteredDecisions.filter((d) => d.decision === 'transform').length;
    const latencyValues = auditFilteredDecisions
      .map((d) => d.latencyMs)
      .filter((value): value is number => typeof value === 'number');
    const avgLatency = latencyValues.length
      ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
      : 0;
    const allowRate = total ? Math.round((allowed / total) * 100) : 0;
    return {
      total,
      denied,
      allowed,
      transformed,
      avgLatency,
      allowRate,
    };
  }, [auditFilteredDecisions]);

  const policyActivity = useMemo(() => {
    const counts = new Map<string, number>();
    auditFilteredDecisions.forEach((decision) => {
      const key = decision.policyId || 'unassigned';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = auditFilteredDecisions.length || 1;
    const items = Array.from(counts.entries())
      .map(([policyId, count]) => ({
        policyId,
        count,
        percent: Math.round((count / total) * 100),
        name:
          policyId === 'unassigned'
            ? 'No policy'
            : policyLookup.get(policyId)?.name || 'Unknown policy',
      }))
      .sort((a, b) => b.count - a.count);
    return { items, total };
  }, [auditFilteredDecisions, policyLookup]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDecisionVariant = (decision: string) => {
    if (decision === 'allow') return 'default';
    if (decision === 'deny') return 'destructive';
    if (decision === 'transform') return 'secondary';
    return 'outline';
  };

  const buildTemplatePolicy = (templateId: string): Policy => {
    const highRiskTools = tools
      .filter((tool) => tool.riskLevel === 'high' || tool.riskLevel === 'critical')
      .map((tool) => tool.toolName);
    const lowRiskTools = tools
      .filter((tool) => tool.riskLevel === 'low' || tool.riskLevel === 'medium')
      .map((tool) => tool.toolName);
    const toolAccess: Record<string, any> = {};

    const basePolicy: Policy = {
      id: '',
      name: '',
      description: '',
      version: 'v1',
      defaults: {
        ingress: { action: 'redact' },
        egress: { action: 'redact' },
      },
      toolAccess: {},
      denyTools: [],
      allowTools: [],
      networkScopes: ['net.'],
      networkTools: ['web.', 'email.', 'calendar.'],
      onError: 'block',
      priority: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    switch (templateId) {
      case 'allowlist': {
        return {
          ...basePolicy,
          name: 'Allowlist Only',
          description: 'Only allow vetted tools and block anything else by default.',
          defaults: {
            ingress: { action: 'block' },
            egress: { action: 'block' },
          },
          allowTools: lowRiskTools.slice(0, 8),
          priority: 20,
        };
      }
      case 'review': {
        highRiskTools.forEach((toolName) => {
          toolAccess[toolName] = {
            direction: 'both',
            action: 'confirm',
            allow_pii: {},
          };
        });
        return {
          ...basePolicy,
          name: 'High-Risk Review',
          description: 'Require confirmation for high-risk tools while allowing standard traffic.',
          defaults: {
            ingress: { action: 'allow' },
            egress: { action: 'allow' },
          },
          toolAccess,
          priority: 10,
        };
      }
      case 'data-guard':
      default: {
        return {
          ...basePolicy,
          name: 'Sensitive Data Guard',
          description: 'Redact sensitive content and block high-risk tools by default.',
          denyTools: highRiskTools,
          priority: 15,
        };
      }
    }
  };

  const handleUseTemplate = (templateId: string) => {
    const templatePolicy = buildTemplatePolicy(templateId);
    setEditingPolicy(templatePolicy);
    setIsCreating(false);
    setActiveView('define');
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
  const policyTemplates = [
    {
      id: 'data-guard',
      title: 'Sensitive Data Guard',
      description: 'Redact sensitive content and block high-risk tools by default.',
      tags: ['Redact by default', 'Block high-risk tools'],
    },
    {
      id: 'review',
      title: 'High-Risk Review',
      description: 'Require human confirmation for high-risk tools.',
      tags: ['Confirm high-risk tools', 'Allow baseline traffic'],
    },
    {
      id: 'allowlist',
      title: 'Allowlist Only',
      description: 'Only allow explicit tools and block anything else.',
      tags: ['Block by default', 'Allowlist tools'],
    },
  ];

  const headerActions =
    activeView === 'define'
      ? canManagePolicies()
        ? (
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
          )
        : (
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
      : (
          <div className="flex gap-2">
            <Button
              onClick={fetchAuditData}
              disabled={auditLoading}
              variant="outline"
              size="sm"
            >
              {auditLoading ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              {auditLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={() => router.push(`/o/${orgSlug}/decisions`)}
              variant="outline"
              size="sm"
            >
              View Decisions
            </Button>
          </div>
        );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Governance Policies"
        subtitle={
          canManagePolicies()
            ? `Define guardrails and audit policy enforcement for ${orgSlug}`
            : `Review organization and personal policies for ${orgSlug}`
        }
        actions={headerActions}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
          <Button
            size="sm"
            variant={activeView === 'define' ? 'default' : 'ghost'}
            onClick={() => setActiveView('define')}
          >
            Define Policies
          </Button>
          <Button
            size="sm"
            variant={activeView === 'audit' ? 'default' : 'ghost'}
            onClick={() => setActiveView('audit')}
          >
            Audit Log
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {activeView === 'define'
            ? 'Design guardrails that shape tool access, data flow, and approvals.'
            : 'Review how policies were applied to recent decisions.'}
        </p>
      </div>

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

      {activeView === 'define' ? (
        <>
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

          {canManagePolicies() && (
            <Card>
              <CardHeader>
                <CardTitle>Policy Templates</CardTitle>
                <CardDescription>Start with best-practice guardrails and customize to your org.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {policyTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold">{template.title}</div>
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleUseTemplate(template.id)}>
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
                {tools.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Add tools to your catalog to auto-populate allowlists and high-risk review templates.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Policy Form (Create/Edit) */}
          {(isCreating || editingPolicy) && (
            <PolicyForm
              policy={editingPolicy ? {
                ...editingPolicy,
                description: editingPolicy.description || '',
              } : undefined}
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
                <Input
                  type="text"
                  placeholder="Search policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
        </>
      ) : (
        <>
          {auditError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Audit Error</h3>
                  <div className="mt-2 text-sm text-red-700">{auditError}</div>
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Policy Audit Filters
              </CardTitle>
              <CardDescription>Slice recent decisions by policy, outcome, and direction.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Time Range</span>
                  <Select
                    value={auditFilters.timeRange}
                    onValueChange={(value) => setAuditFilters((prev) => ({ ...prev, timeRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Policy</span>
                  <Select
                    value={auditFilters.policyId}
                    onValueChange={(value) => setAuditFilters((prev) => ({ ...prev, policyId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All policies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All policies</SelectItem>
                      <SelectItem value="unassigned">No policy</SelectItem>
                      {policies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Decision</span>
                  <Select
                    value={auditFilters.decision}
                    onValueChange={(value) => setAuditFilters((prev) => ({ ...prev, decision: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All decisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All decisions</SelectItem>
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="transform">Transform</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Direction</span>
                  <Select
                    value={auditFilters.direction}
                    onValueChange={(value) => setAuditFilters((prev) => ({ ...prev, direction: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All directions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All directions</SelectItem>
                      <SelectItem value="precheck">Pre-check</SelectItem>
                      <SelectItem value="postcheck">Post-check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search by policy, tool, decision, or correlation ID"
                  className="flex-1 min-w-[220px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAuditData}
                  disabled={auditLoading}
                >
                  {auditLoading ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                  {auditLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/o/${orgSlug}/decisions`)}
                >
                  Open Decisions
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Decisions</p>
                    <p className="text-2xl font-bold">{auditSummary.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Blocked</p>
                    <p className="text-2xl font-bold text-red-600">{auditSummary.denied}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Allow Rate</p>
                    <p className="text-2xl font-bold text-green-600">{auditSummary.allowRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Avg Latency</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {auditSummary.avgLatency ? `${auditSummary.avgLatency} ms` : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Policy Decisions</CardTitle>
                <CardDescription>Decisions that matched your current filters.</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : auditFilteredDecisions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No decisions found for this filter set.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Policy</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tool</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Decision</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Direction</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {auditFilteredDecisions.slice(0, 12).map((decision) => {
                          const policyName = decision.policyId
                            ? policyLookup.get(decision.policyId)?.name || 'Unknown policy'
                            : 'No policy';
                          return (
                            <tr key={decision.id} className="hover:bg-muted/30">
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {formatDate(decision.ts)}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                <Badge variant="outline">{policyName}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {decision.tool || 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                <Badge variant={getDecisionVariant(decision.decision)}>
                                  {decision.decision?.toUpperCase() || 'UNKNOWN'}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-xs">
                                <Badge variant="outline">{decision.direction || 'N/A'}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {decision.latencyMs ? `${decision.latencyMs} ms` : 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Policy Activity</CardTitle>
                <CardDescription>Which policies are firing most often.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {policyActivity.items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No policy activity to summarize yet.
                  </div>
                ) : (
                  policyActivity.items.slice(0, 6).map((item) => (
                    <div key={item.policyId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <Progress value={item.percent} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
