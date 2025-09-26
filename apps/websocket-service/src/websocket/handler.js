import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { MessageValidator } from './validator.js';
import { ChannelManager } from './channels.js';

/**
 * WebSocket Handler for GovernsAI
 * 
 * Manages WebSocket connections, message routing, and real-time communication
 * for AI governance decisions (precheck/postcheck).
 */
export class WebSocketHandler {
  constructor(wss, services) {
    this.wss = wss;
    this.services = services;
    this.connections = new Map(); // connectionId -> connection info
    this.orgConnections = new Map(); // orgId -> Set of connectionIds
    this.userConnections = new Map(); // userId -> Set of connectionIds
    
    this.validator = new MessageValidator();
    this.channelManager = new ChannelManager();
    
    this.setupWebSocketServer();
    this.startHeartbeat();
    
    console.log('🔌 WebSocket handler initialized');
  }

  /**
   * Setup WebSocket server event handlers
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, request) {
    const connectionId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`🔌 New connection attempt: ${connectionId}`);

      // Parse connection parameters
      const url = new URL(request.url, `http://${request.headers.host}`);
      console.log("21")  
      const { key, org, channels, session, token } = Object.fromEntries(url.searchParams);
      console.log("22")  
      // Authenticate connection
      const authResult = await this.authenticateConnection({ key, org, session, token });
      console.log("23")  
      if (!authResult.success) {
        console.log(`❌ Authentication failed for ${connectionId}: ${authResult.error}`);
        ws.close(1008, authResult.error);
        return;
      }
      console.log("24")  
      const { userId, orgId, apiKey, userEmail } = authResult;

      // Create connection info
      const connectionInfo = {
        id: connectionId,
        ws,
        userId,
        orgId,
        apiKey,
        userEmail,
        channels: channels ? channels.split(',') : [],
        connectedAt: new Date(),
        lastSeen: new Date(),
        messageCount: 0,
        isActive: true
      };
      console.log("25")  
      // Store connection
      this.connections.set(connectionId, connectionInfo);
      this.addToOrgConnections(orgId, connectionId);
      this.addToUserConnections(userId, connectionId);
      console.log("26")  
      // Setup WebSocket event handlers
      this.setupConnectionHandlers(ws, connectionInfo);
      console.log("27")  
      // Subscribe to initial channels
      if (connectionInfo.channels.length > 0) {
        await this.channelManager.subscribe(connectionId, connectionInfo.channels);
      }
      console.log("28")  
      // Send welcome message
      this.sendMessage(ws, {
        type: 'READY',
        connectionId,
        channels: connectionInfo.channels,
        timestamp: new Date().toISOString(),
        server: 'GovernsAI WebSocket Service v1.0.0'
      });
      console.log("29")  
      // Log successful connection
      const duration = Date.now() - startTime;
      console.log(`✅ Connection established: ${connectionId} (${userEmail}) in ${duration}ms`);
      console.log("30")  
      // Update health service
      this.services.healthService.recordConnection(connectionId, orgId);
      console.log("31")  
    } catch (error) {
      console.error(`❌ Connection setup error for ${connectionId}:`, error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Setup event handlers for a WebSocket connection
   */
  setupConnectionHandlers(ws, connectionInfo) {
    const { id: connectionId } = connectionInfo;

    console.log("26.1")  
    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        console.log("26.2")  
        await this.handleMessage(connectionId, data);
      } catch (error) {
        console.error(`❌ Message handling error for ${connectionId}:`, error);
        this.sendError(ws, 'MESSAGE_PROCESSING_ERROR', error.message);
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log("26.3")  
      this.handleDisconnection(connectionId, code, reason);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      console.log("26.4")  
      console.error(`❌ WebSocket error for ${connectionId}:`, error);
      this.handleDisconnection(connectionId, 1006, 'Connection error');
    });

    // Handle pong responses
    ws.on('pong', () => {
      console.log("26.5")  
      if (this.connections.has(connectionId)) {
        this.connections.get(connectionId).lastSeen = new Date();
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  async handleMessage(connectionId, data) {
    console.log("26.2.1")  
    const connection = this.connections.get(connectionId);
    console.log("26.2.2")  
    if (!connection) {
      console.log("26.2.3")  
      console.log(`❌ Message from unknown connection: ${connectionId}`);
      return;
    }
    console.log("26.2.4")  
    // Update connection stats
    connection.lastSeen = new Date();
    connection.messageCount++;
    console.log("26.2.5")  
    // Parse message
    let message;
    try {
      console.log("26.2.6")  
      console.log(`📨 Raw message from ${connectionId}: ${data.toString()}`);
      message = JSON.parse(data.toString());
      console.log(`📨 Parsed message:`, JSON.stringify(message, null, 2));
      console.log("26.2.7")  
    } catch (error) {
      console.error(`❌ JSON parse error:`, error);
      this.sendError(connection.ws, 'INVALID_JSON', 'Message must be valid JSON');
      return;
    }
    console.log("26.2.8")  
    // Validate message structure
    const validation = this.validator.validateMessage(message);
    if (!validation.success) {
      this.sendError(connection.ws, 'INVALID_MESSAGE', validation.error);
      return;
    }

    console.log(`📨 Message from ${connectionId}: ${message.type}`);
    console.log("26.2.9  ======", message.type)  
    // Route message based on type
    switch (message.type) {
      case 'PING':
        await this.handlePing(connection, message);
        break;
      
      case 'INGEST':
        console.log("26.2.10")  
        await this.handleIngest(connection, message);
        break;
      
      case 'SUB':
        await this.handleSubscription(connection, message);
        break;
      
      case 'UNSUB':
        await this.handleUnsubscription(connection, message);
        break;
      
      default:
        this.sendError(connection.ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle PING message
   */
  async handlePing(connection, message) {
    this.sendMessage(connection.ws, {
      type: 'PONG',
      timestamp: new Date().toISOString(),
      latency: message.timestamp ? Date.now() - new Date(message.timestamp).getTime() : null
    });
  }

  /**
   * Handle INGEST message (precheck/postcheck decisions)
   */
  async handleIngest(connection, message) {
    try {
      console.log("26.2.10.1")  
      const { channel, schema, idempotencyKey, data } = message;

      // Validate schema
      if (!['decision.v1', 'toolcall.v1', 'dlq.v1'].includes(schema)) {
        throw new Error(`Unsupported schema: ${schema}`);
      }
      console.log("26.2.10.2 ======", schema)  
      // Validate data based on schema
      let validation;
      if (schema === 'decision.v1') {
        validation = this.validator.validateDecisionData(data);
      } else if (schema === 'dlq.v1') {
        // For DLQ messages, we'll just validate basic structure
        validation = { success: true }; // TODO: Add DLQ validation
      } else if (schema === 'toolcall.v1') {
        // For toolcall messages, we'll just validate basic structure
        validation = { success: true }; // TODO: Add toolcall validation
      } else {
        validation = { success: false, error: 'Unknown schema' };
      }
      console.log("26.2.10.3 ======", validation)  
      if (!validation.success) {
        throw new Error(`Invalid ${schema} data: ${validation.error}`);
      }
      console.log("26.2.10.4")  
      // Check authorization for channel
      if (!this.channelManager.canPublishToChannel(connection, channel)) {
        throw new Error(`Not authorized to publish to channel: ${channel}`);
      }
      console.log("26.2.10.5")  
      // Process the message based on schema
      let result;
      if (schema === 'decision.v1') {
        // Ensure orgId is in the data object for validation
        const dataWithOrgId = { ...data, orgId: connection.orgId };
        console.log("26.2.10.6")  
        result = await this.services.decisionService.processDecision({
          orgId: connection.orgId, // Top-level orgId for decision service
          userId: connection.userId,
          apiKey: connection.apiKey,
          channel,
          idempotencyKey,
          receivedAt: new Date(),
          ...dataWithOrgId // Spread data with orgId
        });
        console.log("26.2.10.7")  
      } else {
        // For non-decision schemas, just log and acknowledge
        console.log(`📝 Received ${schema} message: ${idempotencyKey}`);
        result = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          wasDedup: false,
          schema,
          channel,
          idempotencyKey
        };
      }
      
      // Send acknowledgment
      this.sendMessage(connection.ws, {
        type: 'ACK',
        id: idempotencyKey,
        decisionId: result.id,
        dedup: result.wasDedup || false,
        schema: result.schema || schema,
        timestamp: new Date().toISOString()
      });

      // Broadcast to subscribers if not a duplicate
      if (!result.wasDedup) {
        await this.broadcastToChannel(channel, {
          type: schema === 'decision.v1' ? 'DECISION' : 'MESSAGE',
          data: {
            id: result.id,
            schema: result.schema || schema,
            channel,
            idempotencyKey,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.log(`✅ ${schema} message processed: ${result.id}`);

    } catch (error) {
      console.error(`❌ INGEST processing error:`, error);
      this.sendError(connection.ws, 'INGEST_PROCESSING_ERROR', error.message);
    }
  }

  /**
   * Handle channel subscription
   */
  async handleSubscription(connection, message) {
    const { channels } = message;
    if (!Array.isArray(channels)) {
      this.sendError(connection.ws, 'INVALID_CHANNELS', 'Channels must be an array');
      return;
    }

    try {
      await this.channelManager.subscribe(connection.id, channels);
      connection.channels = [...new Set([...connection.channels, ...channels])];
      
      this.sendMessage(connection.ws, {
        type: 'SUB_ACK',
        channels,
        timestamp: new Date().toISOString()
      });

      console.log(`📡 ${connection.id} subscribed to: ${channels.join(', ')}`);
    } catch (error) {
      this.sendError(connection.ws, 'SUBSCRIPTION_ERROR', error.message);
    }
  }

  /**
   * Handle channel unsubscription
   */
  async handleUnsubscription(connection, message) {
    const { channels } = message;
    if (!Array.isArray(channels)) {
      this.sendError(connection.ws, 'INVALID_CHANNELS', 'Channels must be an array');
      return;
    }

    try {
      await this.channelManager.unsubscribe(connection.id, channels);
      connection.channels = connection.channels.filter(c => !channels.includes(c));
      
      this.sendMessage(connection.ws, {
        type: 'UNSUB_ACK',
        channels,
        timestamp: new Date().toISOString()
      });

      console.log(`📡 ${connection.id} unsubscribed from: ${channels.join(', ')}`);
    } catch (error) {
      this.sendError(connection.ws, 'UNSUBSCRIPTION_ERROR', error.message);
    }
  }

  /**
   * Handle connection disconnection
   */
  handleDisconnection(connectionId, code, reason) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    console.log(`🔌 Connection closed: ${connectionId} (${code}: ${reason})`);

    // Remove from tracking maps
    this.connections.delete(connectionId);
    this.removeFromOrgConnections(connection.orgId, connectionId);
    this.removeFromUserConnections(connection.userId, connectionId);

    // Unsubscribe from all channels
    this.channelManager.unsubscribeAll(connectionId);

    // Update health service
    this.services.healthService.recordDisconnection(connectionId);
  }

  /**
   * Authenticate WebSocket connection
   */
  async authenticateConnection({ key, org, session, token }) {
    try {
      if (key && org) {
        // API key authentication
        return await this.services.authService.authenticateApiKey(key, org);
      } else if (session && token) {
        // Session token authentication
        return await this.services.authService.authenticateSession(session, token);
      } else {
        return { success: false, error: 'Missing authentication parameters' };
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Send message to WebSocket
   */
  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to WebSocket
   */
  sendError(ws, code, detail) {
    this.sendMessage(ws, {
      type: 'ERROR',
      code,
      detail,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all subscribers of a channel
   */
  async broadcastToChannel(channel, message) {
    const subscribers = this.channelManager.getChannelSubscribers(channel);
    let sentCount = 0;

    for (const connectionId of subscribers) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(connection.ws, message);
        sentCount++;
      }
    }

    if (sentCount > 0) {
      console.log(`📡 Broadcast to ${channel}: ${sentCount} recipients`);
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      for (const [connectionId, connection] of this.connections) {
        const timeSinceLastSeen = now - connection.lastSeen.getTime();
        
        if (timeSinceLastSeen > timeout) {
          console.log(`💀 Connection timeout: ${connectionId}`);
          connection.ws.terminate();
          this.handleDisconnection(connectionId, 1001, 'Timeout');
        } else if (timeSinceLastSeen > timeout / 2) {
          // Send ping if connection is idle for 30 seconds
          connection.ws.ping();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Add connection to org tracking
   */
  addToOrgConnections(orgId, connectionId) {
    if (!this.orgConnections.has(orgId)) {
      this.orgConnections.set(orgId, new Set());
    }
    this.orgConnections.get(orgId).add(connectionId);
  }

  /**
   * Remove connection from org tracking
   */
  removeFromOrgConnections(orgId, connectionId) {
    if (this.orgConnections.has(orgId)) {
      this.orgConnections.get(orgId).delete(connectionId);
      if (this.orgConnections.get(orgId).size === 0) {
        this.orgConnections.delete(orgId);
      }
    }
  }

  /**
   * Add connection to user tracking
   */
  addToUserConnections(userId, connectionId) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(connectionId);
  }

  /**
   * Remove connection from user tracking
   */
  removeFromUserConnections(userId, connectionId) {
    if (this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(connectionId);
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  /**
   * Get connection count
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Get connections by organization
   */
  async getConnectionsByOrg(orgId) {
    const connectionIds = this.orgConnections.get(orgId) || new Set();
    const connections = [];

    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connections.push({
          id: connection.id,
          userId: connection.userId,
          userEmail: connection.userEmail,
          connectedAt: connection.connectedAt,
          lastSeen: connection.lastSeen,
          messageCount: connection.messageCount,
          channels: connection.channels,
          isActive: connection.isActive
        });
      }
    }

    return connections;
  }

  /**
   * Shutdown handler
   */
  async shutdown() {
    console.log('🛑 Shutting down WebSocket handler...');
    
    // Close all connections
    for (const [connectionId, connection] of this.connections) {
      connection.ws.close(1001, 'Server shutting down');
    }
    
    // Clear all tracking
    this.connections.clear();
    this.orgConnections.clear();
    this.userConnections.clear();
    
    console.log('✅ WebSocket handler shutdown complete');
  }
}
