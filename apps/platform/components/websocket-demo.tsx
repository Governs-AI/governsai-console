'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/lib/websocket-client';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@governs-ai/ui';
import { Play, Square, Wifi, WifiOff } from 'lucide-react';

interface WebSocketEvent {
  id: string;
  channel: string;
  data: any;
  timestamp: string;
}

export default function WebSocketDemo() {
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set());

  const { client, isConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'EVENT' && message.channel && message.data) {
        const event: WebSocketEvent = {
          id: Math.random().toString(36).substr(2, 9),
          channel: message.channel,
          data: message.data,
          timestamp: new Date().toISOString(),
        };
        setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  const handleSubscribe = (channel: string) => {
    client.subscribe([channel]);
    setSubscribedChannels(prev => new Set([...prev, channel]));
  };

  const handleUnsubscribe = (channel: string) => {
    client.unsubscribe([channel]);
    setSubscribedChannels(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel);
      return newSet;
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? <Wifi className="h-5 w-5 text-success" /> : <WifiOff className="h-5 w-5 text-danger" />}
            WebSocket Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Available Channels</h4>
              <div className="flex flex-wrap gap-2">
                {['org:test:approvals', 'org:test:decisions', 'user:123:notifications', 'key:key1:usage'].map((channel) => (
                  <div key={channel} className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{channel}</code>
                    {subscribedChannels.has(channel) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnsubscribe(channel)}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Unsub
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSubscribe(channel)}
                        disabled={!isConnected}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Sub
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Recent Events</h4>
                <Button size="sm" variant="outline" onClick={clearEvents}>
                  Clear
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events yet</p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="border rounded p-2 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{event.channel}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
