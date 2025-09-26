import { WebSocket } from 'ws';

// Get API key and org from environment or use defaults
const apiKey = process.env.API_KEY || 'gai_test_key_1234567890abcdef';
const orgSlug = process.env.ORG_SLUG || 'test-org';

console.log('🧪 Testing WebSocket with Real API Key');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🔑 API Key: ${apiKey.slice(0, 10)}...`);
console.log(`🏢 Organization: ${orgSlug}`);

const wsUrl = `ws://localhost:9000/ws?key=${apiKey}&org=${orgSlug}`;
console.log(`🔌 Connecting to: ${wsUrl}`);
console.log('');

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  console.log('🚀 Sending test messages...');
  
  // Send PING
  ws.send(JSON.stringify({
    type: 'PING',
    timestamp: new Date().toISOString()
  }));
  
  // Send a test decision
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'INGEST',
      channel: `org:${orgSlug}:decisions`,
      schema: 'decision.v1',
      idempotencyKey: `test-${Date.now()}`,
      data: {
        orgId: orgSlug,
        direction: 'precheck',
        decision: 'allow',
        tool: 'web.fetch',
        scope: 'https://api.example.com',
        payloadHash: `sha256:test-${Math.random().toString(36).substr(2, 9)}`,
        latencyMs: 45,
        correlationId: `test-${Date.now()}`,
        tags: ['test'],
        ts: new Date().toISOString()
      }
    }));
  }, 1000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log(`📨 [${message.type}]:`, message);
  
  if (message.type === 'PONG') {
    console.log('✅ PONG received - WebSocket is working!');
  } else if (message.type === 'ACK') {
    console.log('✅ Decision acknowledged!');
  } else if (message.type === 'ERROR') {
    console.log('❌ Error:', message.detail);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  if (error.message.includes('Invalid API key')) {
    console.log('');
    console.log('💡 To fix this:');
    console.log('1. Start the platform: cd apps/platform && pnpm run dev');
    console.log('2. Go to http://localhost:3002/o/your-org/keys');
    console.log('3. Create a new API key');
    console.log('4. Use it: API_KEY=your_real_key ORG_SLUG=your_org node test-with-real-key.js');
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('⏰ Test completed, closing connection...');
  ws.close();
}, 5000);
