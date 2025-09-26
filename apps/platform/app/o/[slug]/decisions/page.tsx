'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  LoadingSpinner,
  PageHeader
} from '@governs-ai/ui';
import {
  RefreshCw,
  Filter,
  Download,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Globe,
  Key,
  AlertCircle
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
}

interface WebSocketConnection {
  id: string;
  sessionId: string;
  userId: string;
  orgId: string;
  gatewayId: string;
  channels: string[];
  isActive: boolean;
  lastSeen: string;
  createdAt: string;
  apiKeyName?: string;
  userEmail?: string;
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
  const [webSocketConnections, setWebSocketConnections] = useState<WebSocketConnection[]>([]);
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'decisions' | 'websockets'>('decisions');
  const [filters, setFilters] = useState({
    direction: '',
    decision: '',
    tool: '',
    timeRange: '24h'
  });

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

      const [decisionsResponse, connectionsResponse] = await Promise.all([
        fetch(`/api/decisions?${decisionsParams}`, { credentials: 'include' }),
        fetch(`/api/websockets/connections?orgSlug=${orgSlug}`, { credentials: 'include' })
      ]);

      if (decisionsResponse.ok) {
        const decisionsData = await decisionsResponse.json();
        console.log('Decisions fetched:', decisionsData.decisions?.length || 0, 'decisions');
        setDecisions(decisionsData.decisions || []);
        setStats(decisionsData.stats || null);
      } else {
        console.error('Failed to fetch decisions:', decisionsResponse.status, decisionsResponse.statusText);
      }

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setWebSocketConnections(connectionsData.connections || []);
      } else {
        console.error('Failed to fetch connections:', connectionsResponse.status, connectionsResponse.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'allow': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'deny': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'transform': return <Zap className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'allow': return <Badge variant="success">Allow</Badge>;
      case 'deny': return <Badge variant="destructive">Deny</Badge>;
      case 'transform': return <Badge variant="warning">Transform</Badge>;
      default: return <Badge variant="secondary">{decision}</Badge>;
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'precheck' 
      ? <Badge variant="outline">Pre-check</Badge>
      : <Badge variant="secondary">Post-check</Badge>;
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  const formatLatency = (latencyMs?: number) => {
    if (!latencyMs) return 'N/A';
    return `${latencyMs}ms`;
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

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('decisions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'decisions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Decisions ({decisions.length})
            </button>
            <button
              onClick={() => setActiveTab('websockets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'websockets'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              WebSocket Connections ({webSocketConnections.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'decisions' && (
          <div className="space-y-4">
            {decisions.length === 0 ? (
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
              <div className="space-y-3">
                {decisions.map((decision) => (
                  <Card key={decision.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getDecisionIcon(decision.decision)}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getDecisionBadge(decision.decision)}
                              {getDirectionBadge(decision.direction)}
                              {decision.tool && (
                                <Badge variant="outline">
                                  <Globe className="h-3 w-3 mr-1" />
                                  {decision.tool}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {decision.scope || 'No scope specified'}
                            </p>
                            {decision.correlationId && (
                              <p className="text-xs text-muted-foreground font-mono">
                                ID: {decision.correlationId}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{formatTimestamp(decision.ts)}</p>
                          <p>{formatLatency(decision.latencyMs)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'websockets' && (
          <div className="space-y-4">
            {webSocketConnections.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No WebSocket Connections</h3>
                  <p className="text-muted-foreground">
                    No active WebSocket connections found. Connections will appear here when clients connect to your WebSocket gateway.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {webSocketConnections.map((connection) => (
                  <Card key={connection.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            connection.isActive ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={connection.isActive ? "success" : "secondary"}>
                                {connection.isActive ? 'Connected' : 'Disconnected'}
                              </Badge>
                              {connection.apiKeyName && (
                                <Badge variant="outline">
                                  <Key className="h-3 w-3 mr-1" />
                                  {connection.apiKeyName}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              User: {connection.userEmail || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              Session: {connection.sessionId}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>Channels:</span>
                              {connection.channels.map((channel, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {channel}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Connected: {formatTimestamp(connection.createdAt)}</p>
                          <p>Last Seen: {formatTimestamp(connection.lastSeen)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
