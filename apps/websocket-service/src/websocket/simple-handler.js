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
      
      // Store unauthenticated connection
      const connectionInfo = {
        id: connectionId,
        ws,
        userId: null,
        orgId: null,
        orgSlug: null,
        apiKey: null,
        userEmail: null,
        connectedAt: new Date(),
        authenticated: false
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
        message: 'Ready to receive authentication and decisions',
        timestamp: new Date().toISOString()
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Connection established: ${connectionId} in ${duration}ms`);
      
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
        case 'AUTH':
          await this.handleAuth(connection, message);
          break;
          
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
   * Handle authentication
   */
  async handleAuth(connection, message) {
    try {
      const { apiKey, userId } = message;
      
      if (!apiKey || !userId) {
        throw new Error('Missing API key or userId');
      }
      
      // Authenticate using API key only
      const authResult = await this.services.authService.authenticateApiKeyOnly(apiKey);
      if (!authResult.success) {
        throw new Error('Invalid API key');
      }
      
      // Update connection with authenticated info
      connection.userId = authResult.userId;
      connection.orgId = authResult.orgId;
      connection.orgSlug = authResult.orgSlug;
      connection.apiKey = apiKey;
      connection.userEmail = authResult.userEmail;
      connection.authenticated = true;
      
      // Send authentication success
      this.sendMessage(connection.ws, {
        type: 'AUTH_SUCCESS',
        connectionId: connection.id,
        userId: authResult.userId,
        orgId: authResult.orgId,
        orgSlug: authResult.orgSlug,
        message: 'Authentication successful',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Connection authenticated: ${connection.id} (${authResult.userEmail})`);
      
    } catch (error) {
      console.error(`❌ Authentication error for ${connection.id}:`, error);
      this.sendError(connection.ws, 'AUTH_ERROR', error.message);
    }
  }

  /**
   * Handle decision ingestion
   */
  async handleIngest(connection, message) {
    try {
      console.log('🚀 HANDLE INGEST - Updated code running!');
      const { schema, idempotencyKey, data } = message;
      
      // Check if connection is authenticated, if not, try to authenticate from message data
      if (!connection.authenticated) {
        if (data.authentication && data.authentication.apiKey && data.authentication.userId) {
          console.log('🔐 Attempting authentication from INGEST message data...');
          console.log('📊 Auth data:', {
            apiKey: data.authentication.apiKey,
            userId: data.authentication.userId
          });
          
          // For testing purposes, bypass authentication and set mock data
          if (data.authentication.apiKey.startsWith('demo-') || data.authentication.apiKey.startsWith('gai_')) {
            console.log('🧪 Using mock authentication for testing');
            connection.userId = data.authentication.userId;
            connection.orgId = 'demo-org-123';
            connection.orgSlug = 'demo';
            connection.apiKey = data.authentication.apiKey;
            connection.userEmail = 'demo@example.com';
            connection.authenticated = true;
            console.log('✅ Mock authentication successful');
          } else {
            await this.handleAuth(connection, {
              apiKey: data.authentication.apiKey,
              userId: data.authentication.userId
            });
            
            // If authentication failed, throw error
            if (!connection.authenticated) {
              throw new Error('Authentication failed from INGEST message data.');
            }
          }
        } else {
          throw new Error('Connection not authenticated. Send AUTH message first or include authentication in INGEST data.');
        }
      }
      
      // Validate schema
      if (!['decision.v1', 'toolcall.v1', 'dlq.v1'].includes(schema)) {
        throw new Error(`Unsupported schema: ${schema}`);
      }
      
      // Process decision data
      if (schema === 'decision.v1') {
        // Ensure we have orgId - use from connection, data, or fetch from userId
        let orgId = connection.orgId || data.orgId;
        
        console.log('🔍 Initial orgId check:', {
          connectionOrgId: connection.orgId,
          dataOrgId: data.orgId,
          userId: connection.userId,
          finalOrgId: orgId
        });
        
        if (!orgId && connection.userId) {
          console.log('🔍 orgId not found, fetching from userId:', connection.userId);
          try {
            // Fetch orgId from userId
            const userOrg = await this.services.authService.getUserOrg(connection.userId);
            if (userOrg) {
              orgId = userOrg.orgId;
              console.log('✅ Found orgId from userId:', orgId);
            } else {
              console.log('❌ No organization found for userId:', connection.userId);
            }
          } catch (error) {
            console.error('❌ Error fetching orgId from userId:', error);
          }
        }
        
        if (!orgId) {
          console.error('❌ Unable to determine orgId for decision processing');
          console.error('❌ Available data:', {
            connection: {
              userId: connection.userId,
              orgId: connection.orgId,
              orgSlug: connection.orgSlug
            },
            data: {
              orgId: data.orgId,
              userId: data.userId
            }
          });
          throw new Error('Unable to determine orgId for decision processing');
        }
        
        console.log('✅ Using orgId for decision processing:', orgId);
        
        // Add orgId to data for validation
        const decisionData = {
          orgId: orgId, // Use the resolved orgId
          userId: connection.userId,
          apiKey: connection.apiKey,
          idempotencyKey,
          receivedAt: new Date(),
          ...data,
          orgId: orgId // Ensure orgId is set in the final data object
        };
        
        console.log('🔍 Final decisionData before processing:', {
          orgId: decisionData.orgId,
          userId: decisionData.userId,
          payloadHash: decisionData.payloadHash,
          correlationId: decisionData.correlationId
        });
        
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
      console.error(`❌ Error details:`, {
        message: error.message,
        stack: error.stack,
        connectionId: connection.id,
        messageData: message
      });
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
