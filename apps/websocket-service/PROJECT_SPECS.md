# GovernsAI WebSocket Service - Project Specifications

## 🎯 Project Overview

The GovernsAI WebSocket Service is a standalone, production-ready service for real-time AI governance decision streaming. It handles precheck/postcheck workflows and provides real-time updates to the GovernsAI platform through WebSocket connections. The service is designed for high-throughput decision processing with comprehensive authentication, message routing, and monitoring capabilities.

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: WebSocket Server (ws library)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + API Key authentication
- **Message Format**: JSON over WebSocket
- **Deployment**: Docker + Railway

### Project Structure
```
apps/websocket-service/
├── src/
│   ├── server.js              # Main server entry point
│   ├── services/              # Core services
│   │   ├── auth.js           # Authentication service
│   │   ├── budget.js         # Budget management service
│   │   ├── decision.js       # Decision processing service
│   │   └── health.js         # Health monitoring service
│   └── websocket/            # WebSocket handlers
│       └── simple-handler.js # WebSocket message handler
├── Dockerfile                 # Docker configuration
├── package.json              # Dependencies and scripts
├── railway.json              # Railway deployment config
└── env.example              # Environment variables template
```

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐
│   Dashboard     │    │  External Apps   │
│   (Vercel)      │    │  (Precheck)      │
└─────────────────┘    └──────────────────┘
         │                       │
         └───────────────────────┘
                    │
         ┌─────────────────────┐
         │  WebSocket Service │
         │    (Railway)       │
         │                    │
         │  - Authentication  │
         │  - Message Routing │
         │  - Decision Storage│
         │  - Real-time Sync  │
         └─────────────────────┘
                    │
         ┌─────────────────────┐
         │     Database        │
         │   (PostgreSQL)      │
         └─────────────────────┘
```

## 🚀 Core Features

### 1. Real-time Decision Streaming
- **Precheck/Postcheck Workflows**: Handle AI governance decisions
- **Decision Processing**: Validate and store governance decisions
- **Real-time Broadcasting**: Stream decisions to connected clients
- **Duplicate Detection**: Idempotency support to prevent duplicate processing

### 2. WebSocket Communication
- **Persistent Connections**: Maintain WebSocket connections
- **Message Routing**: Channel-based message routing
- **Authentication**: API key and session token authentication
- **Connection Management**: Handle connection lifecycle

### 3. Authentication & Authorization
- **API Key Authentication**: Secure API key validation
- **Session Token Support**: JWT-based session authentication
- **Organization Isolation**: Multi-tenant security
- **Permission Scoping**: Fine-grained access control

### 4. Message Processing
- **Message Types**: INGEST, SUB, UNSUB, PING/PONG
- **Schema Validation**: Message format validation
- **Error Handling**: Comprehensive error handling
- **Message Queuing**: Reliable message delivery

### 5. Health Monitoring
- **Health Checks**: Comprehensive health monitoring
- **Metrics Collection**: Performance and usage metrics
- **Connection Tracking**: Monitor active connections
- **Error Tracking**: Track and report errors

### 6. Budget Management
- **Real-time Budget Updates**: Stream budget changes
- **Usage Tracking**: Monitor spending in real-time
- **Alert System**: Budget threshold notifications
- **Subscription Management**: Manage budget subscriptions

## 🔌 WebSocket API

### Connection Endpoint
```
wss://your-service.railway.app/ws?key=gai_xxx&org=your-org
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

#### 3. UNSUB - Unsubscribe from Channels
```json
{
  "type": "UNSUB",
  "channels": ["org:your-org:decisions"]
}
```

#### 4. PING - Heartbeat
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

#### BUDGET_UPDATE - Budget Change Notification
```json
{
  "type": "BUDGET_UPDATE",
  "channel": "org:your-org:budget",
  "data": {
    "orgId": "your-org",
    "budgetRemaining": 5000.00,
    "budgetUsed": 2000.00,
    "budgetTotal": 7000.00,
    "lastUpdate": "2024-01-01T00:00:00Z"
  }
}
```

#### PONG - Heartbeat Response
```json
{
  "type": "PONG",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🔧 Core Services

### 1. Authentication Service (`auth.js`)
- **API Key Validation**: Validate API keys against database
- **Session Authentication**: JWT token validation
- **Organization Access**: Verify organization membership
- **Permission Checking**: Scope-based permission validation
- **Audit Logging**: Log authentication events

### 2. Decision Service (`decision.js`)
- **Decision Processing**: Process incoming decisions
- **Duplicate Detection**: Prevent duplicate processing
- **Data Validation**: Validate decision data
- **Database Storage**: Store decisions in database
- **Policy Integration**: Apply organization policies

### 3. Budget Service (`budget.js`)
- **Budget Subscriptions**: Manage budget subscriptions
- **Real-time Updates**: Stream budget changes
- **Usage Tracking**: Monitor spending patterns
- **Alert Management**: Handle budget alerts

### 4. Health Service (`health.js`)
- **Health Monitoring**: Track service health
- **Metrics Collection**: Collect performance metrics
- **Connection Tracking**: Monitor WebSocket connections
- **Error Reporting**: Track and report errors

## 🔐 Security Features

### Authentication
- **API Key Authentication**: Secure API key validation
- **JWT Token Support**: Session-based authentication
- **Organization Isolation**: Multi-tenant security
- **Permission Scoping**: Fine-grained access control

### Authorization
- **Channel Access Control**: Restrict channel access
- **Organization Membership**: Verify organization access
- **API Key Scopes**: Scope-based permissions
- **Rate Limiting**: Prevent abuse

### Data Protection
- **Message Encryption**: Secure message transmission
- **Audit Logging**: Comprehensive audit trail
- **Data Validation**: Input validation and sanitization
- **Error Handling**: Secure error handling

## 📊 Database Integration

### Core Entities
- **API Keys**: API key management and validation
- **Organizations**: Multi-tenant organization support
- **Users**: User management and authentication
- **Decisions**: Decision storage and retrieval
- **Audit Logs**: Comprehensive audit trail
- **Budget Records**: Budget and spending data

### Database Operations
- **Connection Pooling**: Efficient database connections
- **Transaction Management**: ACID compliance
- **Query Optimization**: Optimized database queries
- **Data Consistency**: Ensure data integrity

## 🚀 Deployment

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-jwt-secret"

# Service Configuration
PORT=3000
NODE_ENV="production"

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_RETENTION_DAYS=30
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Railway Deployment
- **Automatic Deployments**: Git-based deployments
- **Environment Management**: Secure environment variables
- **Scaling**: Horizontal scaling support
- **Monitoring**: Built-in monitoring and logging

## 📈 Performance & Scalability

### Performance Optimizations
- **Connection Pooling**: Efficient WebSocket connections
- **Message Batching**: Batch message processing
- **Caching**: In-memory caching for frequent data
- **Compression**: Message compression support

### Scalability Features
- **Horizontal Scaling**: Multiple service instances
- **Load Balancing**: Distribute connections
- **Message Queuing**: Reliable message delivery
- **Database Optimization**: Optimized database queries

## 🔧 Development

### Available Scripts
```bash
# Development
npm run dev              # Start with nodemon
npm start               # Start production server

# Docker
npm run docker:build    # Build Docker image
npm run docker:run      # Run Docker container

# Testing
npm test                # Run tests (when implemented)
```

### Development Guidelines
- **ES6 Modules**: Modern JavaScript modules
- **Error Handling**: Comprehensive error handling
- **Logging**: Structured logging
- **Testing**: Unit and integration tests
- **Documentation**: Comprehensive documentation

## 🔗 Integration Points

### External Services
- **Database**: PostgreSQL with Prisma ORM
- **Platform**: GovernsAI Platform integration
- **Authentication**: API key and JWT validation
- **Monitoring**: Health and metrics collection

### Internal Services
- **Authentication Service**: User and API key validation
- **Decision Service**: Decision processing and storage
- **Budget Service**: Budget management and updates
- **Health Service**: Monitoring and metrics

## 📊 Monitoring & Metrics

### Health Monitoring
- **Service Health**: Overall service health
- **Connection Metrics**: Active connection tracking
- **Message Metrics**: Message processing statistics
- **Error Tracking**: Error rates and types

### Performance Metrics
- **Response Times**: Message processing times
- **Throughput**: Messages per second
- **Connection Count**: Active connections
- **Error Rates**: Error frequency and types

### Business Metrics
- **Decision Volume**: Decisions processed
- **Organization Usage**: Per-organization metrics
- **API Key Usage**: API key utilization
- **Budget Updates**: Budget change frequency

## 🎯 Success Metrics

### Key Performance Indicators (KPIs)
- **Connection Stability**: Connection uptime and reliability
- **Message Throughput**: Messages processed per second
- **Decision Processing**: Decision processing latency
- **Error Rates**: Error frequency and resolution
- **User Satisfaction**: Service reliability and performance

### Monitoring & Alerting
- **Service Health**: Overall service health monitoring
- **Connection Monitoring**: WebSocket connection tracking
- **Message Processing**: Message processing performance
- **Error Tracking**: Error detection and alerting
- **Business Metrics**: Usage and performance tracking

## 🔮 Future Enhancements

### Planned Features
- **Message Persistence**: Reliable message delivery
- **Advanced Routing**: Complex message routing rules
- **Rate Limiting**: Advanced rate limiting
- **Message Encryption**: End-to-end encryption
- **Analytics Dashboard**: Real-time analytics

### Technical Improvements
- **Microservices**: Service decomposition
- **Event Sourcing**: Event-driven architecture
- **Message Queuing**: Advanced message queuing
- **Caching**: Distributed caching
- **Load Balancing**: Advanced load balancing

## 🚨 Error Handling

### Error Types
- **Authentication Errors**: Invalid credentials
- **Authorization Errors**: Insufficient permissions
- **Validation Errors**: Invalid message format
- **Processing Errors**: Decision processing failures
- **Connection Errors**: WebSocket connection issues

### Error Responses
```json
{
  "type": "ERROR",
  "code": "AUTH_FAILED",
  "message": "Authentication failed",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Recovery
- **Automatic Retry**: Retry failed operations
- **Graceful Degradation**: Continue operation with reduced functionality
- **Error Logging**: Comprehensive error logging
- **Alert System**: Error notification system

---

*This specification document provides a comprehensive overview of the GovernsAI WebSocket Service project, including its architecture, features, API endpoints, security measures, and development guidelines.*
