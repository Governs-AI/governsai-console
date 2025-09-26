import { WebSocket } from 'ws';

console.log('🧪 Testing WebSocket Connection');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const wsUrl = 'ws://localhost:9000/ws?key=test_key&org=test-org';
console.log(`🔌 Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'PING',
    timestamp: new Date().toISOString()
  }));
  
  console.log('📤 Sent PING message');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', message);
  
  if (message.type === 'PONG') {
    console.log('✅ PONG received - WebSocket is working!');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});
