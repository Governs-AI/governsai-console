import { WebSocket } from 'ws';

console.log('🧪 Testing with Real API Key from Dashboard');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const wsUrl = 'ws://localhost:9000/ws?key=gai_827eode3nxa&org=dfy';
console.log(`🔌 Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected successfully with real API key!');
  
  // Send the exact message from your example
  const message = {
    type: 'INGEST',
    channel: 'org:cmfzriajm0003fyp86ocrgjoj:decisions',
    schema: 'decision.v1',
    idempotencyKey: 'precheck-1758911152-req-123',
    data: {
      orgId: 'dfy',
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
      tags: [],
      ts: '2025-09-26T11:25:52Z'
    }
  };
  
  console.log('📤 Sending decision message...');
  ws.send(JSON.stringify(message));
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
  }
  
  ws.close();
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});
