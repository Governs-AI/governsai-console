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
  Badge,
  Input
} from '@governs-ai/ui';
import PlatformShell from '@/components/platform-shell';
import { useWebSocket } from '@/lib/websocket-client';
import { 
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  Globe,
  User,
  Settings,
  Key,
  Wifi,
  WifiOff,
  Play,
  Square
} from 'lucide-react';

interface Channel {
  id: string;
  channel: string;
  type: 'org' | 'user' | 'key';
  name: string;
  description?: string;
  keyName?: string;
  createdAt: string;
}

interface WebSocketGateway {
  id: string;
  name: string;
  url: string;
  sessionId: string;
}

export default function KeysPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [gateway, setGateway] = useState<WebSocketGateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set());
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.slug as string;

  // Form state
  const [formData, setFormData] = useState({
    channelType: 'org' as 'org' | 'user' | 'key',
    channelName: '',
    keyId: '',
    description: '',
  });

  // WebSocket connection
  const { client, isConnected } = useWebSocket({
    onMessage: (message) => {
      console.log('WebSocket message:', message);
      if (message.type === 'EVENT') {
        // Handle real-time events
        console.log('Event received:', message.channel, message.data);
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [channelsResponse, gatewayResponse] = await Promise.all([
        fetch('/api/ws/channels', {
          method: 'GET',
          credentials: 'include',
        }),
        fetch('/api/ws', {
          method: 'GET',
          credentials: 'include',
        }),
      ]);

      if (!channelsResponse.ok || !gatewayResponse.ok) {
        setError('Failed to load data');
        return;
      }

      const [channelsData, gatewayData] = await Promise.all([
        channelsResponse.json(),
        gatewayResponse.json(),
      ]);

      setChannels(channelsData.channels || []);
      setGateway(gatewayData.gateway || null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/ws/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create channel');
        return;
      }

      const data = await response.json();
      setChannels(prev => [data.channel, ...prev]);
      setShowCreateForm(false);
      setFormData({ 
        channelType: 'org', 
        channelName: '', 
        keyId: '', 
        description: '' 
      });
    } catch (err) {
      console.error('Failed to create channel:', err);
      setError('Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (channel: string) => {
    if (!isConnected) {
      setError('WebSocket not connected');
      return;
    }

    client.subscribe([channel]);
    setSubscribedChannels(prev => new Set([...prev, channel]));
  };

  const handleUnsubscribe = async (channel: string) => {
    if (!isConnected) {
      setError('WebSocket not connected');
      return;
    }

    client.unsubscribe([channel]);
    setSubscribedChannels(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel);
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, channel: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedChannel(channel);
      setTimeout(() => setCopiedChannel(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading && channels.length === 0) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading channels...</p>
          </div>
        </div>
      </PlatformShell>
    );
  }

  const orgChannels = channels.filter(ch => ch.type === 'org');
  const userChannels = channels.filter(ch => ch.type === 'user');
  const keyChannels = channels.filter(ch => ch.type === 'key');
  const subscribedCount = subscribedChannels.size;

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title="WebSocket Channels"
          subtitle={`Manage real-time channels for ${orgSlug}`}
          actions={
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {showCreateForm ? 'Cancel' : 'Add Channel'}
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Total Channels" value={channels.length.toString()} />
          <KpiCard label="Subscribed" value={subscribedCount.toString()} />
          <KpiCard label="Org Channels" value={orgChannels.length.toString()} />
          <KpiCard label="User Channels" value={userChannels.length.toString()} />
        </div>

        {/* WebSocket Status */}
        {gateway && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                WebSocket Gateway
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Gateway:</span>
                  <span className="text-sm text-muted-foreground">{gateway.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
                    <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Session ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{gateway.sessionId}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateChannel} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Channel Type</label>
                    <select
                      value={formData.channelType}
                      onChange={(e) => setFormData(prev => ({ ...prev, channelType: e.target.value as 'org' | 'user' | 'key' }))}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    >
                      <option value="org">Organization Level</option>
                      <option value="user">User Level</option>
                      <option value="key">Key Level</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Channel Name</label>
                    <Input
                      value={formData.channelName}
                      onChange={(e) => setFormData(prev => ({ ...prev, channelName: e.target.value }))}
                      placeholder="approvals, decisions, dlq, usage"
                      required
                    />
                  </div>
                </div>
                {formData.channelType === 'key' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <Input
                      value={formData.keyId}
                      onChange={(e) => setFormData(prev => ({ ...prev, keyId: e.target.value }))}
                      placeholder="API Key ID"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description of this channel"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Channel'}
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

        {/* Channels Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Channels</h2>
            <div className="text-sm text-muted-foreground">
              {channels.length} total, {subscribedCount} subscribed
            </div>
          </div>
          
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Channel</DataTableHead>
                <DataTableHead>Type</DataTableHead>
                <DataTableHead>Name</DataTableHead>
                <DataTableHead>Description</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>Actions</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {channels.map((channel) => (
                <DataTableRow key={channel.id}>
                  <DataTableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {channel.channel}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(channel.channel, channel.channel)}
                      >
                        {copiedChannel === channel.channel ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={channel.type === 'org' ? 'default' : channel.type === 'user' ? 'secondary' : 'outline'}>
                      {channel.type === 'org' ? (
                        <>
                          <Globe className="h-3 w-3 mr-1" />
                          Org
                        </>
                      ) : channel.type === 'user' ? (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          User
                        </>
                      ) : (
                        <>
                          <Key className="h-3 w-3 mr-1" />
                          Key
                        </>
                      )}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <div>
                      <div className="font-medium">{channel.name}</div>
                      {channel.keyName && (
                        <div className="text-sm text-muted-foreground">
                          {channel.keyName}
                        </div>
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="text-sm text-muted-foreground">
                      {channel.description || '—'}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={subscribedChannels.has(channel.channel) ? 'default' : 'secondary'}>
                      {subscribedChannels.has(channel.channel) ? 'Subscribed' : 'Not Subscribed'}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex gap-1">
                      {subscribedChannels.has(channel.channel) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUnsubscribe(channel.channel)}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSubscribe(channel.channel)}
                          disabled={!isConnected}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
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
              Channel Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Organization Level:</strong> Applied to all users in the organization. Examples: org:abc:approvals, org:abc:decisions</p>
              <p><strong>User Level:</strong> Applied only to the specific user. Examples: user:123:notifications, user:123:settings</p>
              <p><strong>Key Level:</strong> Applied to specific API key usage. Examples: key:key1:usage, key:key1:errors</p>
              <p><strong>Usage:</strong> Subscribe to channels to receive real-time events. Use the WebSocket client for programmatic access.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}