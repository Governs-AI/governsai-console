# GovernsAI WebSocket Service

A standalone, production-ready WebSocket service for real-time AI governance decision streaming. This service handles precheck/postcheck workflows and provides real-time updates to the GovernsAI platform.

## 🚀 Features

- **Real-time Decision Streaming**: Process and broadcast AI governance decisions
- **Channel-based Routing**: Organize messages by organization, user, or API key
- **Duplicate Detection**: Idempotency support to prevent duplicate processing
- **Authentication**: API key and session token authentication
- **Health Monitoring**: Comprehensive health checks and metrics
- **Production Ready**: Docker support, graceful shutdown, error handling
- **Scalable**: Designed for high-throughput decision processing

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Dashboard     │    │  External Apps   │
│   (Vercel)      │    │  (Precheck)      │
└─────────────────┘    └──────────────────┘
         │                       │
         └───────────────────────┘
                    │
         ┌─────────────────────┐
         │  WebSocket Service  │
         │    (Railway)        │
         │                     │
         │  - Authentication   │
         │  - Message Routing  │
         │  - Decision Storage │
         │  - Real-time Sync   │
         └─────────────────────┘
                    │
         ┌─────────────────────┐
         │     Database        │
         │   (PostgreSQL)      │
         └─────────────────────┘
```

## 📡 WebSocket API

### Connection

Connect to the WebSocket endpoint with authentication:

```javascript
const ws = new WebSocket('wss://your-service.railway.app/ws?key=gai_xxx&org=your-org');
```

### Message Types

#### 1. INGEST - Send Decision Data
```json
{
  "type": "INGEST",
  "channel": "org:your-org:decisions",
  "schema": "decision.v1",
  "idempotencyKey": "unique-key-123",
  "data": {
    "orgId": "your-org",
    "direction": "precheck",
    "decision": "allow",
    "tool": "web.fetch",
    "scope": "https://api.example.com",
    "payloadHash": "sha256:abc123...",
    "latencyMs": 45,
    "correlationId": "req-001",
    "tags": ["production"]
  }
}
```

#### 2. SUB - Subscribe to Channels
```json
{
  "type": "SUB",
  "channels": ["org:your-org:decisions", "user:your-id:notifications"]
}
```

#### 3. PING - Heartbeat
```json
{
  "type": "PING",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Server Responses

#### ACK - Decision Acknowledged
```json
{
  "type": "ACK",
  "id": "unique-key-123",
  "decisionId": "dec_abc123",
  "dedup": false
}
```

#### DECISION - Real-time Decision Update
```json
{
  "type": "DECISION",
  "data": {
    "id": "dec_abc123",
    "orgId": "your-org",
    "direction": "precheck",
    "decision": "allow",
    "tool": "web.fetch",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Access to `@governs-ai/db` package

### Setup

1. **Clone and install dependencies**:
```bash
cd apps/websocket-service
npm install
```

2. **Configure environment**:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start development server**:
```bash
npm run dev
```

The service will be available at:
- WebSocket: `ws://localhost:3000/ws`
- HTTP API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

### Available Scripts

- `npm run dev` - Start with nodemon for development
- `npm start` - Start production server
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

## 🚀 Deployment

### Railway Deployment

1. **Connect to Railway**:
```bash
railway login
railway link
```

2. **Deploy**:
```bash
railway up
```

3. **Set environment variables** in Railway dashboard:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
ALLOWED_ORIGINS=https://your-dashboard.vercel.app
```

### Docker Deployment

1. **Build image**:
```bash
docker build -t governs-websocket .
```

2. **Run container**:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  governs-websocket
```

## 📊 Monitoring

### Health Endpoints

- `GET /health` - Basic health status
- `GET /info` - Service information
- `GET /api/connections` - Active connections

### Health Response Example
```json
{
  "status": "healthy",
  "uptime": { "seconds": 3600, "human": "1h 0m" },
  "metrics": {
    "connections": { "total": 150, "active": 12, "peak": 25 },
    "messages": { "received": 1250, "sent": 1300, "errors": 2 },
    "decisions": { "processed": 800, "duplicates": 15, "errors": 1 }
  },
  "memory": { "heapUsed": 45, "heapTotal": 67 }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Service port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3002` |
| `MAX_CONNECTIONS` | Maximum WebSocket connections | `10000` |
| `CACHE_MAX_SIZE` | Decision cache size | `10000` |

### Channel Format

Channels follow the format: `{type}:{id}:{category}`

- **Types**: `org`, `user`, `key`
- **Categories**: `decisions`, `notifications`, `usage`
- **Examples**: 
  - `org:acme-corp:decisions`
  - `user:user123:notifications`
  - `key:gai_abc123:usage`

## 🔐 Security

- **Authentication**: API key or session token required
- **CORS**: Configurable allowed origins
- **Rate Limiting**: Built-in message rate limiting
- **Input Validation**: All messages validated with Zod schemas
- **Channel Permissions**: Users can only access their own channels

## 🧪 Testing

### Manual Testing

1. **Start the service**:
```bash
npm run dev
```

2. **Test WebSocket connection**:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?key=test_key&org=test-org');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Received:', event.data);
```

3. **Send test decision**:
```javascript
ws.send(JSON.stringify({
  type: 'INGEST',
  channel: 'org:test-org:decisions',
  schema: 'decision.v1',
  idempotencyKey: 'test-001',
  data: {
    orgId: 'test-org',
    direction: 'precheck',
    decision: 'allow',
    payloadHash: 'sha256:test123'
  }
}));
```

## 📈 Performance

- **Throughput**: Designed for 1000+ messages/second
- **Latency**: Sub-10ms message processing
- **Memory**: Efficient caching with automatic cleanup
- **Connections**: Supports 10,000+ concurrent connections

## 🤝 Integration

### Dashboard Integration

Update WebSocket URLs in the platform to point to this service:

```javascript
// In apps/platform/app/api/ws/generate-url/route.ts
const wsServerUrl = process.env.NODE_ENV === 'production' 
  ? 'wss://your-websocket-service.railway.app/ws'
  : 'ws://localhost:3000/ws';
```

### External Client Integration

```python
# Python example
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    print(f"Received: {data}")

def on_open(ws):
    # Send a decision
    ws.send(json.dumps({
        "type": "INGEST",
        "channel": "org:your-org:decisions",
        "schema": "decision.v1",
        "idempotencyKey": "python-001",
        "data": {
            "orgId": "your-org",
            "direction": "precheck",
            "decision": "allow",
            "payloadHash": "sha256:python123"
        }
    }))

ws = websocket.WebSocketApp(
    "wss://your-service.railway.app/ws?key=gai_xxx&org=your-org",
    on_message=on_message,
    on_open=on_open
)
ws.run_forever()
```

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the health endpoint: `/health`
2. Review logs for error messages
3. Verify environment configuration
4. Test with simple PING messages first
