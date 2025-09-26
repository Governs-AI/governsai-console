import { WebSocket } from 'ws';

console.log('🧪 Comprehensive WebSocket Test with Real API Key');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Your exact URL from the dashboard
const wsUrl = 'ws://localhost:9000/ws?key=gai_827eode3nxa&org=dfy&channels=org:cmfzriajm0003fyp86ocrgjoj:decisions,org:cmfzriajm0003fyp86ocrgjoj:postcheck,org:cmfzriajm0003fyp86ocrgjoj:dlq,org:cmfzriajm0003fyp86ocrgjoj:precheck,org:cmfzriajm0003fyp86ocrgjoj:approvals,user:cmfzriaip0000fyp81gjfkri9:notifications';

console.log(`🔌 Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  
  // Send a precheck decision
  const precheckMessage = {
    type: 'INGEST',
    channel: 'org:cmfzriajm0003fyp86ocrgjoj:precheck',
    schema: 'decision.v1',
    idempotencyKey: `precheck-${Date.now()}-req-123`,
    data: {
      orgId: 'cmfzriajm0003fyp86ocrgjoj', // Use actual org ID, not slug
      direction: 'precheck',
      decision: 'transform',
      tool: 'web.fetch',
      scope: 'net.external',
      detectorSummary: {
        reasons: ['field.redacted:password', 'pii.redacted:email_address'],
        confidence: 0.95,
        piiDetected: []
      },
      payloadHash: 'sha256:ee96e1c3e2d9b73afce948b486d569a589111a2a56be57762064d3ac93a7012d',
      latencyMs: 22,
      correlationId: 'req-123',
      tags: ['test', 'precheck'],
      ts: new Date().toISOString()
    }
  };
  
  console.log('📤 Sending precheck decision...');
  ws.send(JSON.stringify(precheckMessage));
  
  // Send a postcheck decision after a short delay
  setTimeout(() => {
    const postcheckMessage = {
      type: 'INGEST',
      channel: 'org:cmfzriajm0003fyp86ocrgjoj:postcheck',
      schema: 'decision.v1',
      idempotencyKey: `postcheck-${Date.now()}-req-456`,
      data: {
        orgId: 'cmfzriajm0003fyp86ocrgjoj', // Use actual org ID, not slug
        direction: 'postcheck',
        decision: 'allow',
        tool: 'web.fetch',
        scope: 'net.external',
        detectorSummary: {
          reasons: ['content.safe'],
          confidence: 0.98,
          piiDetected: []
        },
        payloadHash: 'sha256:postcheck-hash-456',
        latencyMs: 45,
        correlationId: 'req-456',
        tags: ['test', 'postcheck'],
        ts: new Date().toISOString()
      }
    };
    
    console.log('📤 Sending postcheck decision...');
    ws.send(JSON.stringify(postcheckMessage));
  }, 1000);
  
  // Send a DLQ message
  setTimeout(() => {
    const dlqMessage = {
      type: 'INGEST',
      channel: 'org:cmfzriajm0003fyp86ocrgjoj:dlq',
      schema: 'dlq.v1',
      idempotencyKey: `dlq-${Date.now()}-req-789`,
      data: {
        orgId: 'dfy',
        originalMessage: {
          type: 'INGEST',
          channel: 'org:cmfzriajm0003fyp86ocrgjoj:decisions',
          schema: 'decision.v1',
          data: { /* original decision data */ }
        },
        reason: 'processing_timeout',
        retryCount: 3,
        maxRetries: 5,
        ts: new Date().toISOString()
      }
    };
    
    console.log('📤 Sending DLQ message...');
    ws.send(JSON.stringify(dlqMessage));
  }, 2000);
  
  // Close connection after all messages
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    ws.close();
  }, 4000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', message);
  
  if (message.type === 'ACK') {
    console.log('✅ Decision processed successfully!');
    console.log(`   Decision ID: ${message.decisionId}`);
    console.log(`   Deduplicated: ${message.dedup}`);
  } else if (message.type === 'ERROR') {
    console.log('❌ Error:', message.detail);
  } else if (message.type === 'READY') {
    console.log('🎯 WebSocket ready!');
    console.log(`   Connection ID: ${message.connectionId}`);
    console.log(`   Available channels: ${message.channels.length}`);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  console.log('✅ Test completed successfully!');
  process.exit(0);
});
