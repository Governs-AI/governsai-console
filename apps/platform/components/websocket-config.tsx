'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  LoadingSpinner
} from '@governs-ai/ui';
import {
  Copy,
  Check,
  Settings,
  Zap,
  Globe,
  User,
  Key,
  AlertCircle,
  Code,
  Play,
  Book,
  Trash2
} from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string | null;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  type: 'org' | 'user' | 'key';
  recommended: boolean;
}

interface WebSocketConfig {
  wsUrl: string;
  apiKey: APIKey;
  channels: string[];
  usage: {
    connect: string;
    send: string;
  };
}

export default function WebSocketConfig() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [generatedConfig, setGeneratedConfig] = useState<WebSocketConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isNewKey, setIsNewKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    try {
      const response = await fetch('/api/ws/generate-url', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration data');
      }

      const data = await response.json();
      setApiKeys(data.apiKeys || []);
      setChannels(data.channels || []);
      
      // Auto-select first API key and recommended channels
      if (data.apiKeys.length > 0) {
        setSelectedApiKey(data.apiKeys[0].id);
      }
      
      const recommendedChannels = data.channels
        .filter((ch: Channel) => ch.recommended)
        .map((ch: Channel) => ch.id);
      setSelectedChannels(recommendedChannels);

      // Auto-generate WebSocket URL if we have API key and channels
      if (data.apiKeys.length > 0 && recommendedChannels.length > 0) {
        setTimeout(() => {
          generateWebSocketUrl(data.apiKeys[0].id, recommendedChannels);
          setIsNewKey(false); // Auto-generated, not new
        }, 100); // Small delay to ensure state is set
      } else if (data.apiKeys.length === 0) {
        // No API keys exist - user will need to create one first
        setGeneratedConfig(null);
        setSelectedApiKey('');
      }

    } catch (err) {
      console.error('Failed to fetch config data:', err);
      setError('Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  const generateWebSocketUrl = async (apiKeyId?: string, channels?: string[]) => {
    const keyId = apiKeyId || selectedApiKey;
    const channelList = channels || selectedChannels;

    if (!keyId || channelList.length === 0) {
      setError('Please select an API key and at least one channel');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/ws/generate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          apiKeyId: keyId,
          channels: channelList,
          description: 'WebSocket URL for precheck/postcheck integration',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate WebSocket URL');
      }

      const data = await response.json();
      setGeneratedConfig(data);
      setIsNewKey(false); // Regular generation

    } catch (err: any) {
      console.error('Failed to generate WebSocket URL:', err);
      setError(err.message || 'Failed to generate WebSocket URL');
    } finally {
      setGenerating(false);
    }
  };

  const regenerateWithNewApiKey = async () => {
    setGenerating(true);
    setError('');
    setSuccessMessage('');

    try {
      // First, create a new API key
      const response = await fetch('/api/ws/generate-url/new-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          channels: selectedChannels,
          description: 'New WebSocket API Key',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create new API key');
      }

      const data = await response.json();
      
      // Update the API keys list and select the new one
      setApiKeys(prev => [data.apiKey, ...prev]);
      setSelectedApiKey(data.apiKey.id);
      setGeneratedConfig(data);
      setIsNewKey(true); // New key generated

    } catch (err: any) {
      console.error('Failed to create new API key:', err);
      setError(err.message || 'Failed to create new API key');
    } finally {
      setGenerating(false);
    }
  };

  const deleteApiKey = async () => {
    if (!selectedApiKey || !generatedConfig) return;

    const confirmed = window.confirm(
      `Are you sure you want to disable the API key "${generatedConfig.apiKey.name}"?\n\nThis will immediately invalidate the WebSocket URL and stop all connections using this key.`
    );

    if (!confirmed) return;

    setGenerating(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/ws/generate-url/delete-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          apiKeyId: selectedApiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable API key');
      }

      // Remove the disabled key from the list
      const updatedKeys = apiKeys.filter(key => key.id !== selectedApiKey);
      setApiKeys(updatedKeys);
      
      // Clear generated config since the key is now disabled
      setGeneratedConfig(null);
      setSelectedApiKey('');
      setIsNewKey(false);
      
      // If no keys left, reset channels to recommended ones
      if (updatedKeys.length === 0) {
        const recommendedChannels = channels
          .filter(ch => ch.recommended)
          .map(ch => ch.id);
        setSelectedChannels(recommendedChannels);
      }

      // Show success message
      setSuccessMessage(`API key "${generatedConfig.apiKey.name}" has been disabled successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000); // Clear after 5 seconds

    } catch (err: any) {
      console.error('Failed to disable API key:', err);
      setError(err.message || 'Failed to disable API key');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(item);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" className="mr-2" />
          <span>Loading WebSocket configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            WebSocket Configuration
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Generate a WebSocket URL for your precheck/postcheck systems. 
            Copy the URL and use it directly in your integration - no additional authentication needed.
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key Selection */}
          {apiKeys.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <select
                value={selectedApiKey}
                onChange={(e) => {
                  setSelectedApiKey(e.target.value);
                  // Clear existing config so user knows to regenerate
                  if (generatedConfig && e.target.value !== selectedApiKey) {
                    setGeneratedConfig(null);
                    setIsNewKey(false);
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="">Select an API key</option>
                {apiKeys.map(key => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.scopes.join(', ')})
                  </option>
                ))}
              </select>
              {selectedApiKey && (
                <p className="text-sm text-muted-foreground mt-1">
                  The API key will be embedded in the WebSocket URL for authentication.
                </p>
              )}
            </div>
          )}

          {/* No API Keys Message */}
          {apiKeys.length === 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Key className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">No API Keys Found</h4>
                  <p className="text-sm text-blue-800">
                    You need to create an API key first. Click "Create API Key & Generate URL" below to get started.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Channels</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {channels.map(channel => (
                <div
                  key={channel.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedChannels.includes(channel.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleChannelToggle(channel.id)}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(channel.id)}
                      onChange={() => handleChannelToggle(channel.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {channel.type === 'org' && <Globe className="h-4 w-4 text-blue-500" />}
                        {channel.type === 'user' && <User className="h-4 w-4 text-green-500" />}
                        {channel.type === 'key' && <Key className="h-4 w-4 text-orange-500" />}
                        <span className="font-medium text-sm">{channel.name}</span>
                        {channel.recommended && (
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {channel.description}
                      </p>
                      <code className="text-xs bg-muted px-1 rounded mt-1 block">
                        {channel.id}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-2">
            {apiKeys.length > 0 ? (
              <>
                <Button
                  onClick={() => generateWebSocketUrl()}
                  disabled={!selectedApiKey || selectedChannels.length === 0 || generating}
                  className="flex items-center gap-2"
                  variant={generatedConfig ? "outline" : "default"}
                >
                  {generating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4" />
                      {generatedConfig ? 'Regenerate WebSocket URL' : 'Generate WebSocket URL'}
                    </>
                  )}
                </Button>
                {generatedConfig && (
                  <>
                    <Button
                      onClick={() => regenerateWithNewApiKey()}
                      disabled={generating}
                      className="flex items-center gap-2"
                      variant="default"
                    >
                      {generating ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4" />
                          Generate New Key & URL
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => deleteApiKey()}
                      disabled={generating}
                      className="flex items-center gap-2"
                      variant="destructive"
                    >
                      {generating ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Disabling...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Disable Key
                        </>
                      )}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Button
                onClick={() => regenerateWithNewApiKey()}
                disabled={selectedChannels.length === 0 || generating}
                className="flex items-center gap-2"
                variant="default"
              >
                {generating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Create API Key & Generate URL
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Display */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md">
              <Check className="h-4 w-4" />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Configuration */}
      {generatedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Generated WebSocket URL
              <Badge variant={isNewKey ? "default" : "secondary"} className="text-xs">
                {isNewKey ? 'New Key Created' : 'Auto-generated'}
              </Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Copy this URL and use it in your precheck/postcheck system
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WebSocket URL */}
            <div>
              <label className="block text-sm font-medium mb-2">WebSocket URL</label>
              <div className="flex gap-2">
                <Input
                  value={generatedConfig.wsUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedConfig.wsUrl, 'url')}
                >
                  {copiedItem === 'url' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Configuration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <span className="text-sm font-medium">API Key:</span>
                <div className="text-sm text-muted-foreground flex items-center">
                  {generatedConfig.apiKey.name}
                  {isNewKey && <Badge variant="outline" className="ml-2 text-xs">Just Created</Badge>}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Channels:</span>
                <p className="text-sm text-muted-foreground">{generatedConfig.channels.length} selected</p>
              </div>
            </div>

            {/* New Key Success Message */}
            {isNewKey && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900 mb-1">New API Key Created</h4>
                    <p className="text-sm text-green-800">
                      A fresh API key "{generatedConfig.apiKey.name}" has been created and is now active. 
                      The old WebSocket URL is no longer valid - use the new URL above.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Usage Examples */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Usage Examples</h4>
              
              {/* Connection Example */}
              <div>
                <label className="block text-sm font-medium mb-2">1. Connect to WebSocket</label>
                <div className="relative">
                  <pre className="text-sm bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
                    <code>{generatedConfig.usage.connect}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(generatedConfig.usage.connect, 'connect')}
                  >
                    {copiedItem === 'connect' ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Send Example */}
              <div>
                <label className="block text-sm font-medium mb-2">2. Send Precheck Decision</label>
                <div className="relative">
                  <pre className="text-sm bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
                    <code>{generatedConfig.usage.send}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(generatedConfig.usage.send, 'send')}
                  >
                    {copiedItem === 'send' ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Start */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Play className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Quick Start</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Copy the WebSocket URL above</li>
                    <li>Connect to the WebSocket in your precheck system</li>
                    <li>Send decision events using the INGEST message format</li>
                    <li>View real-time updates in your dashboard</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Documentation Link */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Book className="h-4 w-4" />
              <span>
                Need help? Check out the{' '}
                <a href="/docs/websocket-integration" className="text-primary hover:underline">
                  WebSocket integration documentation
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
