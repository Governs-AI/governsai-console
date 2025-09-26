/**
 * Simplified WebSocket Handler - Data Ingestion Only
 * 
 * Purpose: Receive precheck/postcheck decisions and save to database
 * No real-time broadcasting, no complex channel management
 */

import { v4 as uuidv4 } from 'uuid';

export class SimpleWebSocketHandler {
  constructor(services) {
    this.services = services;
    this.connections = new Map();
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, req) {
    const connectionId = uuidv4();
    const startTime = Date.now();
    
    try {
      console.log(`🔌 New connection: ${connectionId}`);
      
      // Parse query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const key = url.searchParams.get('key');
      const org = url.searchParams.get('org');
      
      if (!key || !org) {
        throw new Error('Missing API key or organization');
      }
      
      // Authenticate
      const authResult = await this.services.authService.authenticateApiKey(key);
      if (!authResult.success) {
        throw new Error('Invalid API key');
      }
      
      if (authResult.orgSlug !== org) {
        throw new Error('Organization mismatch');
      }
      
      // Store connection info
      const connectionInfo = {
        id: connectionId,
        ws,
        userId: authResult.userId,
        orgId: authResult.orgId,
        orgSlug: authResult.orgSlug,
        apiKey: key,
        userEmail: authResult.userEmail,
        connectedAt: new Date()
      };
      
      this.connections.set(connectionId, connectionInfo);
      
      // Setup message handlers
      ws.on('message', async (data) => {
        try {
          await this.handleMessage(connectionInfo, data);
        } catch (error) {
          console.error(`❌ Message error for ${connectionId}:`, error);
          this.sendError(ws, 'MESSAGE_ERROR', error.message);
        }
      });
      
      ws.on('close', (code, reason) => {
        console.log(`🔌 Connection closed: ${connectionId} (${code}: ${reason})`);
        this.connections.delete(connectionId);
      });
      
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });
      
      // Send ready message
      this.sendMessage(ws, {
        type: 'READY',
        connectionId,
        message: 'Ready to receive decisions',
        timestamp: new Date().toISOString()
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Connection established: ${connectionId} (${authResult.userEmail}) in ${duration}ms`);
      
    } catch (error) {
      console.error(`❌ Connection error for ${connectionId}:`, error);
      this.sendError(ws, 'CONNECTION_ERROR', error.message);
      ws.close(1008, error.message);
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(connection, data) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Message from ${connection.id}: ${message.type}`);
      
      switch (message.type) {
        case 'PING':
          this.sendMessage(connection.ws, {
            type: 'PONG',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'INGEST':
          await this.handleIngest(connection, message);
          break;
          
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Message processing error:`, error);
      throw error;
    }
  }

  /**
   * Handle decision ingestion
   */
  async handleIngest(connection, message) {
    try {
      const { schema, idempotencyKey, data } = message;
      
      // Validate schema
      if (!['decision.v1', 'toolcall.v1', 'dlq.v1'].includes(schema)) {
        throw new Error(`Unsupported schema: ${schema}`);
      }
      
      // Process decision data
      if (schema === 'decision.v1') {
        // Add orgId to data for validation
        const decisionData = {
          orgId: connection.orgId,
          userId: connection.userId,
          apiKey: connection.apiKey,
          idempotencyKey,
          receivedAt: new Date(),
          ...data
        };
        
        const result = await this.services.decisionService.processDecision(decisionData);
        
        // Send acknowledgment
        this.sendMessage(connection.ws, {
          type: 'ACK',
          id: idempotencyKey,
          decisionId: result.id,
          dedup: result.wasDedup || false,
          schema: 'decision.v1',
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Decision processed: ${result.id} ${result.wasDedup ? '(duplicate)' : ''}`);
        
      } else {
        // For other schemas, just acknowledge
        console.log(`📝 Received ${schema} message: ${idempotencyKey}`);
        
        this.sendMessage(connection.ws, {
          type: 'ACK',
          id: idempotencyKey,
          schema,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error(`❌ Ingest error:`, error);
      this.sendError(connection.ws, 'INGEST_ERROR', error.message);
    }
  }

  /**
   * Send message to WebSocket
   */
  sendMessage(ws, message) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  sendError(ws, type, message) {
    this.sendMessage(ws, {
      type: 'ERROR',
      error: type,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        orgSlug: conn.orgSlug,
        userEmail: conn.userEmail,
        connectedAt: conn.connectedAt
      }))
    };
  }

  /**
   * Shutdown handler
   */
  async shutdown() {
    console.log('🛑 Shutting down WebSocket handler...');
    
    // Close all connections
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.ws.close(1001, 'Server shutting down');
      } catch (error) {
        console.error(`Error closing connection ${connectionId}:`, error);
      }
    }
    
    this.connections.clear();
    console.log('✅ WebSocket handler shutdown complete');
  }
}
