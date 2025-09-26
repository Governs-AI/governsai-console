/**
 * Channel Manager for WebSocket connections
 * 
 * Manages channel subscriptions, permissions, and message routing
 * for the GovernsAI WebSocket service.
 */
export class ChannelManager {
  constructor() {
    this.subscriptions = new Map(); // connectionId -> Set of channels
    this.channelSubscribers = new Map(); // channel -> Set of connectionIds
    this.permissions = new Map(); // connectionId -> permissions object
  }

  /**
   * Subscribe a connection to channels
   */
  async subscribe(connectionId, channels) {
    if (!Array.isArray(channels)) {
      throw new Error('Channels must be an array');
    }

    // Get or create subscription set for this connection
    if (!this.subscriptions.has(connectionId)) {
      this.subscriptions.set(connectionId, new Set());
    }
    const connectionChannels = this.subscriptions.get(connectionId);

    // Subscribe to each channel
    for (const channel of channels) {
      // Validate channel format
      this.validateChannelName(channel);

      // Add to connection's channels
      connectionChannels.add(channel);

      // Add to channel's subscribers
      if (!this.channelSubscribers.has(channel)) {
        this.channelSubscribers.set(channel, new Set());
      }
      this.channelSubscribers.get(channel).add(connectionId);
    }

    console.log(`📡 Connection ${connectionId} subscribed to ${channels.length} channels`);
  }

  /**
   * Unsubscribe a connection from channels
   */
  async unsubscribe(connectionId, channels) {
    if (!Array.isArray(channels)) {
      throw new Error('Channels must be an array');
    }

    const connectionChannels = this.subscriptions.get(connectionId);
    if (!connectionChannels) {
      return; // Connection not found
    }

    // Unsubscribe from each channel
    for (const channel of channels) {
      // Remove from connection's channels
      connectionChannels.delete(channel);

      // Remove from channel's subscribers
      const channelSubs = this.channelSubscribers.get(channel);
      if (channelSubs) {
        channelSubs.delete(connectionId);
        
        // Clean up empty channel
        if (channelSubs.size === 0) {
          this.channelSubscribers.delete(channel);
        }
      }
    }

    console.log(`📡 Connection ${connectionId} unsubscribed from ${channels.length} channels`);
  }

  /**
   * Unsubscribe a connection from all channels
   */
  unsubscribeAll(connectionId) {
    const connectionChannels = this.subscriptions.get(connectionId);
    if (!connectionChannels) {
      return;
    }

    const channels = Array.from(connectionChannels);
    this.unsubscribe(connectionId, channels);
    
    // Clean up connection
    this.subscriptions.delete(connectionId);
    this.permissions.delete(connectionId);
  }

  /**
   * Get all subscribers for a channel
   */
  getChannelSubscribers(channel) {
    return this.channelSubscribers.get(channel) || new Set();
  }

  /**
   * Get all channels a connection is subscribed to
   */
  getConnectionChannels(connectionId) {
    return Array.from(this.subscriptions.get(connectionId) || new Set());
  }

  /**
   * Check if connection can publish to a channel
   */
  canPublishToChannel(connection, channel) {
    try {
      const { type, id, category } = this.parseChannel(channel);
      
      switch (type) {
        case 'org':
          // Can publish to own organization channels
          return connection.orgId === id;
        
        case 'user':
          // Can publish to own user channels
          return connection.userId === id;
        
        case 'key':
          // Can publish to own API key channels
          return connection.apiKey === id;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking publish permission:', error);
      return false;
    }
  }

  /**
   * Check if connection can subscribe to a channel
   */
  canSubscribeToChannel(connection, channel) {
    try {
      const { type, id, category } = this.parseChannel(channel);
      
      switch (type) {
        case 'org':
          // Can subscribe to own organization channels
          return connection.orgId === id;
        
        case 'user':
          // Can subscribe to own user channels
          return connection.userId === id;
        
        case 'key':
          // Can subscribe to own API key channels
          return connection.apiKey === id;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking subscribe permission:', error);
      return false;
    }
  }

  /**
   * Generate allowed channels for a connection
   */
  generateAllowedChannels(connection) {
    const channels = [];
    
    // Organization channels
    if (connection.orgId) {
      channels.push(
        `org:${connection.orgId}:decisions`,
        `org:${connection.orgId}:notifications`,
        `org:${connection.orgId}:precheck`,
        `org:${connection.orgId}:postcheck`,
        `org:${connection.orgId}:dlq`,
        `org:${connection.orgId}:approvals`
      );
    }
    
    // User channels
    if (connection.userId) {
      channels.push(
        `user:${connection.userId}:notifications`,
        `user:${connection.userId}:usage`
      );
    }
    
    // API key channels
    if (connection.apiKey) {
      channels.push(
        `key:${connection.apiKey}:usage`
      );
    }
    
    return channels;
  }

  /**
   * Validate channel name format
   */
  validateChannelName(channel) {
    if (typeof channel !== 'string') {
      throw new Error('Channel name must be a string');
    }

    // Allow more categories for AI governance: decisions, notifications, usage, precheck, postcheck, dlq, approvals
    const channelRegex = /^(org|user|key):[a-zA-Z0-9_-]+:(decisions|notifications|usage|precheck|postcheck|dlq|approvals)$/;
    if (!channelRegex.test(channel)) {
      throw new Error(`Invalid channel format: ${channel}. Must be {type}:{id}:{category} where category is one of: decisions, notifications, usage, precheck, postcheck, dlq, approvals`);
    }
  }

  /**
   * Parse channel name into components
   */
  parseChannel(channel) {
    this.validateChannelName(channel);
    const [type, id, category] = channel.split(':');
    return { type, id, category };
  }

  /**
   * Get channel statistics
   */
  getChannelStats() {
    const stats = {
      totalChannels: this.channelSubscribers.size,
      totalSubscriptions: this.subscriptions.size,
      channels: {}
    };

    // Get stats for each channel
    for (const [channel, subscribers] of this.channelSubscribers) {
      const { type, category } = this.parseChannel(channel);
      
      if (!stats.channels[type]) {
        stats.channels[type] = {};
      }
      
      if (!stats.channels[type][category]) {
        stats.channels[type][category] = {
          count: 0,
          subscribers: 0
        };
      }
      
      stats.channels[type][category].count++;
      stats.channels[type][category].subscribers += subscribers.size;
    }

    return stats;
  }

  /**
   * Get active channels list
   */
  getActiveChannels() {
    return Array.from(this.channelSubscribers.keys()).map(channel => {
      const { type, id, category } = this.parseChannel(channel);
      const subscriberCount = this.channelSubscribers.get(channel).size;
      
      return {
        channel,
        type,
        id,
        category,
        subscribers: subscriberCount
      };
    });
  }

  /**
   * Clean up empty channels and stale subscriptions
   */
  cleanup() {
    let cleanedChannels = 0;
    let cleanedSubscriptions = 0;

    // Clean up empty channels
    for (const [channel, subscribers] of this.channelSubscribers) {
      if (subscribers.size === 0) {
        this.channelSubscribers.delete(channel);
        cleanedChannels++;
      }
    }

    // Clean up empty subscriptions
    for (const [connectionId, channels] of this.subscriptions) {
      if (channels.size === 0) {
        this.subscriptions.delete(connectionId);
        this.permissions.delete(connectionId);
        cleanedSubscriptions++;
      }
    }

    if (cleanedChannels > 0 || cleanedSubscriptions > 0) {
      console.log(`🧹 Cleaned up ${cleanedChannels} empty channels and ${cleanedSubscriptions} empty subscriptions`);
    }

    return { cleanedChannels, cleanedSubscriptions };
  }

  /**
   * Set connection permissions
   */
  setConnectionPermissions(connectionId, permissions) {
    this.permissions.set(connectionId, permissions);
  }

  /**
   * Get connection permissions
   */
  getConnectionPermissions(connectionId) {
    return this.permissions.get(connectionId) || {};
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      subscriptions: Object.fromEntries(
        Array.from(this.subscriptions.entries()).map(([connId, channels]) => [
          connId,
          Array.from(channels)
        ])
      ),
      channelSubscribers: Object.fromEntries(
        Array.from(this.channelSubscribers.entries()).map(([channel, subs]) => [
          channel,
          Array.from(subs)
        ])
      ),
      permissions: Object.fromEntries(this.permissions),
      stats: this.getChannelStats()
    };
  }
}
