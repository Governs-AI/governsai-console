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
          
        case 'SUB':
          await this.handleSubscribe(connection, message);
          break;
          
        case 'UNSUB':
          await this.handleUnsubscribe(connection, message);
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
      const { apiKey } = message;
      
      if (!apiKey) {
        throw new Error('Missing API key');
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
        if (data.authentication && data.authentication.apiKey) {
          console.log('🔐 Attempting authentication from INGEST message data...');
          console.log('📊 Auth data:', {
            apiKey: data.authentication.apiKey,
            userId: data.authentication.userId
          });
          
          // Authenticate using the provided API key and userId
          await this.handleAuth(connection, { apiKey: data.authentication.apiKey });
          
          // If authentication failed, throw error
          if (!connection.authenticated) {
            throw new Error('Authentication failed from INGEST message data.');
          }
        } else {
          throw new Error('Connection not authenticated. Send AUTH message first or include authentication.apiKey in INGEST data.');
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
        
        // Fetch unified policy (org > user) for this context (optional for processing, useful for enforcement/logging)
        if (this.services.decisionService?.fetchUnifiedPolicy) {
          try {
            const unifiedPolicy = await this.services.decisionService.fetchUnifiedPolicy(orgId, connection.userId);
            console.log('📜 Unified policy fetched for ingestion:', {
              hasPolicy: !!unifiedPolicy,
              orgId,
              userId: connection.userId
            });
          } catch (e) {
            console.error('⚠️ Failed to fetch unified policy:', e);
          }
        }

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
        
        // Check for context save intent (keywords detection)
        if (this.shouldSaveContext(data)) {
          console.log('💾 Context save intent detected, emitting to Platform...');
          await this.emitContextSave(connection, data, decisionData);
        }
        
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
   * Handle subscription to channels
   */
  async handleSubscribe(connection, message) {
    try {
      const { channels } = message;
      
      if (!connection.authenticated) {
        throw new Error('Must be authenticated to subscribe to channels');
      }
      
      if (!channels || !Array.isArray(channels)) {
        throw new Error('Channels array is required');
      }
      
      for (const channel of channels) {
        if (channel.startsWith('org:') && channel.endsWith(':budget')) {
          const orgId = channel.split(':')[1];
          if (orgId === connection.orgId) {
            // Subscribe to budget updates
            if (this.services.budgetService) {
              this.services.budgetService.subscribe(orgId, connection);
            }
          }
        }
      }
      
      this.sendMessage(connection.ws, {
        type: 'SUB_SUCCESS',
        channels,
        message: 'Successfully subscribed to channels',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`❌ Subscription error for ${connection.id}:`, error);
      this.sendError(connection.ws, 'SUB_ERROR', error.message);
    }
  }

  /**
   * Handle unsubscription from channels
   */
  async handleUnsubscribe(connection, message) {
    try {
      const { channels } = message;
      
      if (!channels || !Array.isArray(channels)) {
        throw new Error('Channels array is required');
      }
      
      for (const channel of channels) {
        if (channel.startsWith('org:') && channel.endsWith(':budget')) {
          const orgId = channel.split(':')[1];
          if (orgId === connection.orgId) {
            // Unsubscribe from budget updates
            if (this.services.budgetService) {
              this.services.budgetService.unsubscribe(orgId, connection);
            }
          }
        }
      }
      
      this.sendMessage(connection.ws, {
        type: 'UNSUB_SUCCESS',
        channels,
        message: 'Successfully unsubscribed from channels',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`❌ Unsubscription error for ${connection.id}:`, error);
      this.sendError(connection.ws, 'UNSUB_ERROR', error.message);
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
   * Check if message content should trigger context save
   */
  shouldSaveContext(data) {
    // Keywords that indicate user wants to save context
    const saveKeywords = [
      'remember this',
      'remember that',
      'remember i',
      'remember we',
      'remember my',
      'remember our',
      'save this',
      'save that',
      'don\'t forget',
      'keep this in mind',
      'note this',
      'note that',
      'make a note',
      'store this'
    ];

    // Check in raw_text_in/rawText (user input) or raw_text_out/rawTextOut (LLM output)
    const textToCheck = (
      data.raw_text_in ||
      data.rawText ||
      data.raw_text_out ||
      data.rawTextOut ||
      ''
    ).toLowerCase();
    
    console.log('🔍 Checking for context save keywords in:', textToCheck);
    const shouldSave = saveKeywords.some(keyword => textToCheck.includes(keyword));
    console.log('💾 Should save context:', shouldSave);
    
    return shouldSave;
  }

  /**
   * Emit context.save event to Platform webhook
   */
  async emitContextSave(connection, data, decisionData) {
    try {
      console.log('🚀 Emitting context.save event to Platform...');
      const webhookUrl = process.env.PLATFORM_WEBHOOK_URL || 'http://localhost:3002/api/governs/webhook';
      const webhookSecret = process.env.WEBHOOK_SECRET || 'dev-secret-key-change-in-production';

      // Build context save payload
      const inText = data.raw_text_in || data.rawText || '';
      const outText = data.raw_text_out || data.rawTextOut || '';
      const payload = {
        type: 'context.save',
        apiKey: connection.apiKey,
        data: {
          content: inText || outText || '',
          contentType: 'user_message',
          agentId: data.tool || 'unknown',
          agentName: data.tool || 'Unknown Agent',
          conversationId: data.conversationId,
          correlationId: data.correlationId || decisionData.correlationId,
          metadata: {
            direction: data.direction,
            tool: data.tool,
            scope: data.scope,
            detectorSummary: data.detectorSummary,
            timestamp: data.timestamp || new Date().toISOString()
          },
          scope: 'user',
          visibility: 'private',
          precheckRef: {
            decision: data.decision || 'allow',
            redactedContent: (outText && inText && outText !== inText) ? outText : undefined,
            piiTypes: this.extractPiiTypes(data.detectorSummary),
            reasons: data.reasons || []
          }
        }
      };

      console.log('📦 Context save payload:', JSON.stringify(payload, null, 2));

      // Create signature
      const timestamp = Math.floor(Date.now() / 1000);
      const payloadString = JSON.stringify(payload);
      const message = `${timestamp}.${payloadString}`;
      const crypto = await import('crypto');
      const signature = crypto.createHmac('sha256', webhookSecret).update(message).digest('hex');
      const signatureHeader = `v1,t=${timestamp},s=${signature}`;

      // Send to Platform webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-governs-signature': signatureHeader
        },
        body: payloadString
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Platform webhook failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Context saved successfully:', result);
      
    } catch (error) {
      console.error('❌ Failed to emit context.save:', error);
      // Don't throw - context save failure shouldn't break the main flow
    }
  }

  /**
   * Extract PII types from detector summary
   */
  extractPiiTypes(detectorSummary) {
    if (!detectorSummary || typeof detectorSummary !== 'object') {
      return [];
    }

    const piiTypes = [];
    
    // Check for PII detector results
    if (detectorSummary.pii && Array.isArray(detectorSummary.pii)) {
      detectorSummary.pii.forEach(detection => {
        if (detection.type) {
          piiTypes.push(detection.type);
        }
      });
    }

    return [...new Set(piiTypes)]; // Remove duplicates
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
