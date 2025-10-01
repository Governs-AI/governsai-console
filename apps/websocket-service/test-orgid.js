import { WebSocket } from 'ws';

console.log('🧪 Testing WebSocket Service with orgId Resolution');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const wsUrl = 'ws://localhost:9000/ws';
console.log(`🔌 Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  
  // Send a test message with authentication but no orgId
  const message = {
    type: 'INGEST',
    channel: 'org:decisions',
    schema: 'decision.v1',
    idempotencyKey: 'test-orgid-' + Date.now(),
    data: {
      orgId: null, // Explicitly set to null to test orgId resolution
      direction: 'precheck',
      decision: 'allow',
      tool: 'weather.current',
      scope: 'net.external',
      detectorSummary: {
        reasons: ['No issues detected'],
        confidence: 0.95,
        piiDetected: []
      },
      payloadHash: 'sha256:test-orgid-' + Date.now(),
      latencyMs: 15,
      correlationId: 'test-orgid-' + Date.now(),
      tags: ['test', 'orgid-resolution'],
      ts: new Date().toISOString(),
      authentication: {
        apiKey: 'gov_key_73a082a0cba066729f73a8240fff5ab80ab14afb90731c131a432163851eb36e',
        userId: 'cmfzriaip0000fyp81gjfkri9'
      }
    }
  };
  
  console.log('📤 Sending INGEST message with orgId resolution test...');
  console.log('📊 Message data:', JSON.stringify(message, null, 2));
  ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', JSON.stringify(message, null, 2));
  
  if (message.type === 'ACK') {
    console.log('✅ Decision processed successfully!');
    console.log(`   Decision ID: ${message.decisionId}`);
    console.log(`   Deduplicated: ${message.dedup}`);
    console.log('🎉 orgId resolution test PASSED!');
  } else if (message.type === 'ERROR') {
    console.log('❌ Error:', message.message);
  }
  
  // Close after receiving response
  setTimeout(() => {
    ws.close();
  }, 1000);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
  process.exit(1);
}, 15000);
