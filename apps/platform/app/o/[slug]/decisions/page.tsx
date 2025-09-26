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
  ChevronUp
} from 'lucide-react';
import PlatformShell from '@/components/platform-shell';

interface Decision {
  id: string;
  orgId: string;
  direction: 'precheck' | 'postcheck';
  decision: 'allow' | 'transform' | 'deny';
  tool?: string;
  scope?: string;
  detectorSummary: Record<string, any>;
  payloadHash: string;
  latencyMs?: number;
  correlationId?: string;
  tags: string[];
  ts: string;
  // Additional fields for better display
  payloadOut?: Record<string, any>;
  reasons?: string[];
  policyId?: string;
}


interface DecisionStats {
  total: number;
  allowed: number;
  denied: number;
  transformed: number;
  precheck: number;
  postcheck: number;
  avgLatency: number;
}

export default function DecisionsPage() {
  const params = useParams();
  const orgSlug = params.slug as string;

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    direction: '',
    decision: '',
    tool: '',
    timeRange: '24h'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDecisions, setExpandedDecisions] = useState<Set<string>>(new Set());

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
      
      // Fetch decisions using the actual organization ID
      const decisionsParams = new URLSearchParams({
        orgId: org.id,
        includeStats: 'true',
        limit: '100',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const decisionsResponse = await fetch(`/api/decisions?${decisionsParams}`, { credentials: 'include' });

      if (decisionsResponse.ok) {
        const decisionsData = await decisionsResponse.json();
        console.log('Decisions fetched:', decisionsData.decisions?.length || 0, 'decisions');
        setDecisions(decisionsData.decisions || []);
        setStats(decisionsData.stats || null);
      } else {
        console.error('Failed to fetch decisions:', decisionsResponse.status, decisionsResponse.statusText);
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

  const toggleExpanded = (decisionId: string) => {
    const newExpanded = new Set(expandedDecisions);
    if (newExpanded.has(decisionId)) {
      newExpanded.delete(decisionId);
    } else {
      newExpanded.add(decisionId);
    }
    setExpandedDecisions(newExpanded);
  };

  const filteredDecisions = decisions.filter(decision => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      decision.id.toLowerCase().includes(searchLower) ||
      decision.decision.toLowerCase().includes(searchLower) ||
      decision.direction.toLowerCase().includes(searchLower) ||
      decision.tool?.toLowerCase().includes(searchLower) ||
      decision.correlationId?.toLowerCase().includes(searchLower) ||
      decision.policyId?.toLowerCase().includes(searchLower) ||
      decision.reasons?.some(reason => reason.toLowerCase().includes(searchLower))
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
      <div className="space-y-6">
        <PageHeader
          title="AI Governance Decisions"
          subtitle={`Monitor real-time decisions and WebSocket connections for ${orgSlug}`}
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

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Decisions</p>
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
                    <p className="text-2xl font-bold text-green-600">{stats.allowed}</p>
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
                    <p className="text-2xl font-bold text-red-600">{stats.denied}</p>
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

        {/* Decisions Content */}
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search decisions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filters.direction}
                  onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value }))}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Directions</option>
                  <option value="precheck">Pre-check</option>
                  <option value="postcheck">Post-check</option>
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
              </div>
            </div>

            {filteredDecisions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Decisions Found</h3>
                  <p className="text-muted-foreground">
                    No AI governance decisions have been recorded yet. Decisions will appear here when your precheck/postcheck system starts sending data.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Decision</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Direction</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tool</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Latency</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDecisions.map((decision) => (
                      <React.Fragment key={decision.id}>
                        <tr className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            {getDecisionBadge(decision.decision)}
                          </td>
                          <td className="px-4 py-3">
                            {getDirectionBadge(decision.direction)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {decision.tool || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatTimestamp(decision.ts)}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatLatency(decision.latencyMs)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpanded(decision.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {expandedDecisions.has(decision.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {expandedDecisions.has(decision.id) && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-muted/20">
                              <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">ID:</span> {decision.id}
                                  </div>
                                  <div>
                                    <span className="font-medium">Correlation ID:</span> {decision.correlationId || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Policy ID:</span> {decision.policyId || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="font-medium">Scope:</span> {decision.scope || 'N/A'}
                                  </div>
                                </div>

                                {/* Payload Hash */}
                                <div>
                                  <span className="font-medium text-sm">Payload Hash:</span>
                                  <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                                    {decision.payloadHash}
                                  </code>
                                </div>

                                {/* Reasons */}
                                {decision.reasons && decision.reasons.length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Reasons:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {decision.reasons.map((reason, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {reason}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Detector Summary */}
                                {decision.detectorSummary && Object.keys(decision.detectorSummary).length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Detector Summary:</span>
                                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(decision.detectorSummary, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {/* Payload Out */}
                                {decision.payloadOut && Object.keys(decision.payloadOut).length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Payload Out:</span>
                                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(decision.payloadOut, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {/* Tags */}
                                {decision.tags && decision.tags.length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Tags:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {decision.tags.map((tag, index) => (
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
    </PlatformShell>
  );
}
