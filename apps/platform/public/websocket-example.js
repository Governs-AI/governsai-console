/**
 * GovernsAI WebSocket Client Example
 * 
 * This example demonstrates how to connect to the GovernsAI WebSocket
 * and send precheck/postcheck decisions.
 * 
 * Usage:
 * 1. Copy your WebSocket URL from the dashboard
 * 2. Replace the wsUrl variable below
 * 3. Run this script in Node.js or browser
 */

// Replace with your WebSocket URL from the dashboard
const wsUrl = 'ws://localhost:3002/api/ws/gateway?key=YOUR_API_KEY&org=YOUR_ORG&channels=org:YOUR_ORG:decisions';

class PrecheckClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.connected = false;
  }

  connect() {
    console.log('Connecting to GovernsAI WebSocket...');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('✅ Connected to GovernsAI WebSocket');
      this.connected = true;
      
      // Subscribe to channels (if needed)
      this.subscribe(['org:YOUR_ORG:decisions']);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Received message:', message);
        
        switch (message.type) {
          case 'READY':
            console.log('🎯 WebSocket ready, subscribed to channels:', message.channels);
            break;
          case 'ACK':
            console.log('✅ Decision acknowledged:', message.id);
            break;
          case 'ERROR':
            console.error('❌ WebSocket error:', message.code, message.detail);
            break;
          case 'EVENT':
            console.log('🔔 Real-time event:', message.channel, message.data);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.connected = false;
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        this.connect();
      }, 5000);
    };
  }

  subscribe(channels) {
    if (!this.connected) {
      console.warn('⚠️ Not connected, queuing subscription');
      return;
    }

    const message = {
      type: 'SUB',
      channels: channels
    };

    this.ws.send(JSON.stringify(message));
    console.log('📡 Subscribed to channels:', channels);
  }

  sendPrecheckDecision(decisionData) {
    if (!this.connected) {
      console.error('❌ Not connected to WebSocket');
      return false;
    }

    const message = {
      type: 'INGEST',
      channel: 'org:YOUR_ORG:decisions', // Replace with your org
      schema: 'decision.v1',
      idempotencyKey: `precheck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        orgId: 'YOUR_ORG', // Replace with your org ID
        direction: 'precheck',
        decision: decisionData.decision || 'allow',
        tool: decisionData.tool || 'web.fetch',
        scope: decisionData.scope || 'https://api.example.com',
        detectorSummary: decisionData.detectorSummary || {
          reasons: ['No PII detected'],
          confidence: 0.95,
          piiDetected: []
        },
        payloadHash: decisionData.payloadHash || `sha256:${Math.random().toString(36)}`,
        latencyMs: decisionData.latencyMs || Math.floor(Math.random() * 100) + 20,
        correlationId: decisionData.correlationId || `req-${Date.now()}`,
        tags: decisionData.tags || ['production', 'api-call'],
        ts: new Date().toISOString()
      }
    };

    this.ws.send(JSON.stringify(message));
    console.log('📤 Sent precheck decision:', message.data);
    return true;
  }

  sendPostcheckDecision(decisionData) {
    if (!this.connected) {
      console.error('❌ Not connected to WebSocket');
      return false;
    }

    const message = {
      type: 'INGEST',
      channel: 'org:YOUR_ORG:decisions', // Replace with your org
      schema: 'decision.v1',
      idempotencyKey: `postcheck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        orgId: 'YOUR_ORG', // Replace with your org ID
        direction: 'postcheck',
        decision: decisionData.decision || 'allow',
        tool: decisionData.tool || 'ai.generate',
        scope: decisionData.scope || 'text-generation',
        detectorSummary: decisionData.detectorSummary || {
          reasons: ['Content filtered'],
          confidence: 0.88,
          piiDetected: []
        },
        payloadHash: decisionData.payloadHash || `sha256:${Math.random().toString(36)}`,
        latencyMs: decisionData.latencyMs || Math.floor(Math.random() * 200) + 50,
        correlationId: decisionData.correlationId || `req-${Date.now()}`,
        tags: decisionData.tags || ['production', 'ai-generation'],
        ts: new Date().toISOString()
      }
    };

    this.ws.send(JSON.stringify(message));
    console.log('📤 Sent postcheck decision:', message.data);
    return true;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Example usage
function main() {
  // Create client instance
  const client = new PrecheckClient(wsUrl);
  
  // Connect to WebSocket
  client.connect();
  
  // Wait for connection, then send some example decisions
  setTimeout(() => {
    // Send a precheck decision (allow)
    client.sendPrecheckDecision({
      decision: 'allow',
      tool: 'web.fetch',
      scope: 'https://api.stripe.com/v1/customers',
      correlationId: 'stripe-customer-fetch-001'
    });
    
    // Send a postcheck decision (transform)
    setTimeout(() => {
      client.sendPostcheckDecision({
        decision: 'transform',
        tool: 'ai.generate',
        scope: 'customer-email-generation',
        correlationId: 'email-gen-002',
        detectorSummary: {
          reasons: ['PII detected and masked'],
          confidence: 0.92,
          piiDetected: ['email', 'name']
        }
      });
    }, 2000);
    
    // Send a precheck decision (deny)
    setTimeout(() => {
      client.sendPrecheckDecision({
        decision: 'deny',
        tool: 'db.query',
        scope: 'SELECT * FROM users WHERE ssn = ?',
        correlationId: 'sensitive-query-003',
        detectorSummary: {
          reasons: ['SSN access not allowed'],
          confidence: 0.99,
          piiDetected: ['ssn']
        }
      });
    }, 4000);
    
  }, 2000); // Wait 2 seconds for connection
  
  // Keep the connection alive for demonstration
  console.log('🚀 WebSocket client started. Check your GovernsAI dashboard for real-time updates!');
  console.log('📊 Decisions will appear in the dashboard within seconds.');
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down WebSocket client...');
    client.disconnect();
    process.exit(0);
  });
}

// Run the example if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  main();
}

// Export for use as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PrecheckClient };
}
