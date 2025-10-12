'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
  Settings,
  Database,
  Code
} from 'lucide-react';
import PlatformShell from '@/components/platform-shell';
import { RoleGuard, useRoleCheck } from '@/components/role-guard';

interface ToolCall {
  id: string;
  orgId: string;
  direction: 'precheck' | 'postcheck';
  decision: 'allow' | 'transform' | 'deny';
  tool: string;
  scope?: string;
  detectorSummary: Record<string, any>;
  payloadHash: string;
  latencyMs?: number;
  correlationId?: string;
  tags: string[];
  ts: string;
  payloadOut?: Record<string, any>;
  reasons?: string[];
  policyId?: string;
}

interface ToolCallStats {
  total: number;
  byTool: Record<string, number>;
  byDecision: Record<string, number>;
  avgLatency: number;
  lastToolcallTime: string | null;
}

export default function ToolCallsPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const { canManageTools, canAccessAdmin } = useRoleCheck();

  const [toolcalls, setToolcalls] = useState<ToolCall[]>([]);
  const [stats, setStats] = useState<ToolCallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    tool: '',
    decision: '',
    timeRange: '24h'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedToolcalls, setExpandedToolcalls] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [orgSlug, filters]);

  const fetchData = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      // First, get the organization ID from the profile API
      const profileResponse = await fetch('/api/profile', { credentials: 'include' });
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile');
      }
      const profileData = await profileResponse.json();
      
      // Find the organization by slug
      const org = profileData.organizations.find((o: any) => o.slug === orgSlug);
      if (!org) {
        throw new Error('Organization not found');
      }
      
      // Fetch toolcalls using the actual organization ID
      const toolcallsParams = new URLSearchParams({
        orgId: org.id,
        includeStats: 'true',
        limit: '100',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const toolcallsResponse = await fetch(`/api/toolcalls?${toolcallsParams}`, { credentials: 'include' });

      if (toolcallsResponse.ok) {
        const toolcallsData = await toolcallsResponse.json();
        console.log('Toolcalls fetched:', toolcallsData.toolcalls?.length || 0, 'toolcalls');
        setToolcalls(toolcallsData.toolcalls || []);
        setStats(toolcallsData.stats || null);
      } else {
        console.error('Failed to fetch toolcalls:', toolcallsResponse.status, toolcallsResponse.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  const formatLatency = (latencyMs?: number) => {
    if (!latencyMs) return 'N/A';
    return `${latencyMs}ms`;
  };

  const toggleExpanded = (toolcallId: string) => {
    const newExpanded = new Set(expandedToolcalls);
    if (newExpanded.has(toolcallId)) {
      newExpanded.delete(toolcallId);
    } else {
      newExpanded.add(toolcallId);
    }
    setExpandedToolcalls(newExpanded);
  };

  const filteredToolcalls = toolcalls.filter(toolcall => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      toolcall.id.toLowerCase().includes(searchLower) ||
      toolcall.tool?.toLowerCase().includes(searchLower) ||
      toolcall.decision.toLowerCase().includes(searchLower) ||
      toolcall.direction.toLowerCase().includes(searchLower) ||
      toolcall.correlationId?.toLowerCase().includes(searchLower) ||
      toolcall.policyId?.toLowerCase().includes(searchLower) ||
      toolcall.reasons?.some(reason => reason.toLowerCase().includes(searchLower))
    );
  });

  const getDecisionVariant = (decision: string) => {
    switch (decision) {
      case 'allow':
        return 'default';
      case 'transform':
        return 'secondary';
      case 'deny':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'allow':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'transform':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'deny':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDecisionBadge = (decision: string) => {
    return (
      <Badge variant={getDecisionVariant(decision)} className="flex items-center gap-1">
        {getDecisionIcon(decision)}
        {decision}
      </Badge>
    );
  };

  const getDirectionBadge = (direction: string) => {
    return (
      <Badge variant="outline">
        {direction === 'precheck' ? 'Pre-check' : 'Post-check'}
      </Badge>
    );
  };

  const getToolIcon = (tool: string) => {
    if (tool.includes('web') || tool.includes('fetch')) {
      return <Database className="h-4 w-4 text-blue-500" />;
    } else if (tool.includes('code') || tool.includes('execute')) {
      return <Code className="h-4 w-4 text-purple-500" />;
    } else if (tool.includes('file')) {
      return <Settings className="h-4 w-4 text-orange-500" />;
    } else {
      return <Wrench className="h-4 w-4 text-gray-500" />;
    }
  };

  const getToolBadge = (tool: string) => {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        {getToolIcon(tool)}
        {tool}
      </Badge>
    );
  };

  // Get unique tools for filter dropdown
  const uniqueTools = Array.from(new Set(toolcalls.map(tc => tc.tool).filter(Boolean)));

  if (loading) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell orgSlug={orgSlug}>
      <RoleGuard requiredPermission="canManageTools">
        <div className="space-y-6">
        <PageHeader
          title="Tool Calls"
          subtitle={`Monitor AI tool usage specifically - shows only decisions that involve tool execution (subset of all decisions) for ${orgSlug}`}
          actions={
            <div className="flex gap-2">
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

        {/* Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Wrench className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-1">About Tool Calls</h3>
                <p className="text-sm text-muted-foreground">
                  This page shows <strong>only decisions involving tool execution</strong> (where the tool field is not null). 
                  For a complete view of all governance decisions including model usage and policy enforcement, see the <strong>Decisions</strong> page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Tool Calls</p>
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
                    <p className="text-sm font-medium">Allowed</p>
                    <p className="text-2xl font-bold text-green-600">{stats.byDecision.allow || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Denied</p>
                    <p className="text-2xl font-bold text-red-600">{stats.byDecision.deny || 0}</p>
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
                    <p className="text-2xl font-bold text-purple-600">{stats.avgLatency}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tool Usage Breakdown */}
        {stats && Object.keys(stats.byTool).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Tool Usage Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.byTool).map(([tool, count]) => (
                  <div key={tool} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getToolIcon(tool)}
                      <span className="font-medium">{tool}</span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool Calls Content */}
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search tool calls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filters.tool}
                  onChange={(e) => setFilters(prev => ({ ...prev, tool: e.target.value }))}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Tools</option>
                  {uniqueTools.map(tool => (
                    <option key={tool} value={tool}>{tool}</option>
                  ))}
                </select>
                <select
                  value={filters.decision}
                  onChange={(e) => setFilters(prev => ({ ...prev, decision: e.target.value }))}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Decisions</option>
                  <option value="allow">Allow</option>
                  <option value="transform">Transform</option>
                  <option value="deny">Deny</option>
                </select>
                <select
                  value={filters.timeRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            {filteredToolcalls.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Tool Calls Found</h3>
                  <p className="text-muted-foreground">
                    No AI tool calls have been recorded yet. Tool calls will appear here when your AI agents start using tools through the governance system.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tool</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Decision</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Direction</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Latency</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredToolcalls.map((toolcall) => (
                      <React.Fragment key={toolcall.id}>
                        <tr className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            {getToolBadge(toolcall.tool)}
                          </td>
                          <td className="px-4 py-3">
                            {getDecisionBadge(toolcall.decision)}
                          </td>
                          <td className="px-4 py-3">
                            {getDirectionBadge(toolcall.direction)}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatTimestamp(toolcall.ts)}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatLatency(toolcall.latencyMs)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpanded(toolcall.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {expandedToolcalls.has(toolcall.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {expandedToolcalls.has(toolcall.id) && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-muted/20">
                              <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">ID:</span> {toolcall.id}
                                  </div>
                                  <div>
                                    <span className="font-medium">Correlation ID:</span> {toolcall.correlationId || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Policy ID:</span> {toolcall.policyId || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Scope:</span> {toolcall.scope || 'N/A'}
                                  </div>
                                </div>

                                {/* Payload Hash */}
                                <div>
                                  <span className="font-medium text-sm">Payload Hash:</span>
                                  <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                                    {toolcall.payloadHash}
                                  </code>
                                </div>

                                {/* Reasons */}
                                {toolcall.reasons && toolcall.reasons.length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Reasons:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {toolcall.reasons.map((reason, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {reason}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Detector Summary */}
                                {toolcall.detectorSummary && Object.keys(toolcall.detectorSummary).length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Detector Summary:</span>
                                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(toolcall.detectorSummary, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {/* Payload Out */}
                                {toolcall.payloadOut && Object.keys(toolcall.payloadOut).length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Payload Out:</span>
                                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(toolcall.payloadOut, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {/* Tags */}
                                {toolcall.tags && toolcall.tags.length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Tags:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {toolcall.tags.map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
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
      </RoleGuard>
    </PlatformShell>
  );
}
