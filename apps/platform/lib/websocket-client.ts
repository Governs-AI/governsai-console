'use client';

import { useState, useEffect } from 'react';

export interface WebSocketMessage {
  type: 'EVENT' | 'HEARTBEAT' | 'ERROR' | 'SUB_SUCCESS' | 'UNSUB_SUCCESS';
  channel?: string;
  cursor?: string;
  data?: any;
  t?: number;
  code?: string;
}

export interface WebSocketClientOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onReconnect?: () => void;
  heartbeatInterval?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: WebSocketClientOptions;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private subscribedChannels = new Set<string>();
  private cursorState = new Map<string, string>();
  private isConnecting = false;

  constructor(options: WebSocketClientOptions = {}) {
    this.options = {
      heartbeatInterval: 30000, // 30 seconds
      reconnectInterval: 5000,  // 5 seconds
      maxReconnectAttempts: 5,
      ...options,
    };
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get WebSocket gateway URL
      const response = await fetch('/api/ws', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get WebSocket gateway');
      }

      const data = await response.json();
      const wsUrl = data.gateway.url;

      // For development, if the URL is a placeholder, we'll simulate the connection
      if (wsUrl.includes('localhost:3002/api/ws/gateway')) {
        console.warn('WebSocket gateway is a placeholder. In production, this would connect to a real WebSocket server.');
        // Simulate successful connection for development
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.options.onOpen?.();
        
        // Simulate some initial events
        setTimeout(() => {
          this.handleMessage({ type: 'HEARTBEAT', t: Date.now() });
        }, 100);
        return;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.options.onOpen?.();

        // Resubscribe to channels
        if (this.subscribedChannels.size > 0) {
          this.subscribe(Array.from(this.subscribedChannels));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.options.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.stopHeartbeat();
        this.options.onClose?.();
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'EVENT':
        if (message.channel && message.cursor) {
          this.cursorState.set(message.channel, message.cursor);
        }
        this.options.onMessage?.(message);
        break;

      case 'HEARTBEAT':
        // Server heartbeat, no action needed
        break;

      case 'ERROR':
        console.error('WebSocket error:', message.code, message.data);
        this.options.onError?.(new Error(message.code || 'Unknown error'));
        break;

      case 'SUB_SUCCESS':
        console.log('Successfully subscribed to channels');
        break;

      case 'UNSUB_SUCCESS':
        console.log('Successfully unsubscribed from channels');
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  subscribe(channels: string[]): void {
    // Handle mock connection for development
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'SUB',
        channels,
      };
      this.ws.send(JSON.stringify(message));
    } else if (!this.ws) {
      // Mock connection - simulate subscription
      console.log('Mock WebSocket: Subscribing to channels', channels);
    } else {
      console.warn('WebSocket not connected, queuing subscription');
    }

    channels.forEach(ch => this.subscribedChannels.add(ch));
  }

  unsubscribe(channels: string[]): void {
    // Handle mock connection for development
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'UNSUB',
        channels,
      };
      this.ws.send(JSON.stringify(message));
    } else if (!this.ws) {
      // Mock connection - simulate unsubscription
      console.log('Mock WebSocket: Unsubscribing from channels', channels);
    } else {
      console.warn('WebSocket not connected, queuing unsubscription');
    }

    channels.forEach(ch => this.subscribedChannels.delete(ch));
  }

  sendAck(channel: string, cursor: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'ACK',
      channel,
      cursor,
    };

    this.ws.send(JSON.stringify(message));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts!) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, this.options.reconnectInterval);
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedChannels.clear();
    this.cursorState.clear();
  }

  getCursorState(): Map<string, string> {
    return new Map(this.cursorState);
  }

  isConnected(): boolean {
    // Handle mock connection for development
    if (!this.ws) {
      return true; // Mock connection is always "connected"
    }
    return this.ws.readyState === WebSocket.OPEN;
  }
}

// React hook for WebSocket
export function useWebSocket(options: WebSocketClientOptions = {}) {
  const [client] = useState(() => new WebSocketClient(options));
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsConnected(true);
    const handleClose = () => setIsConnected(false);

    client.options.onOpen = () => {
      handleOpen();
      options.onOpen?.();
    };

    client.options.onClose = () => {
      handleClose();
      options.onClose?.();
    };

    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

  return {
    client,
    isConnected,
    subscribe: client.subscribe.bind(client),
    unsubscribe: client.unsubscribe.bind(client),
    sendAck: client.sendAck.bind(client),
  };
}
