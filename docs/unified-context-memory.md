# Unified Context Memory System 🧠

## Overview

The Unified Context Memory System enables cross-agent memory sharing across all GovernsAI applications. Since all apps use "Login with GovernsAI", we can build ONE context memory service that works across:

- Demo Chat app
- Platform dashboard  
- Future apps (docs, landing, etc.)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           GovernsAI Auth (Keycloak)                     │
│   User logs in once → Gets user_id + org_id             │
└─────────────────────────────────────────────────────────┘
                         ↓
         ┌───────────────────────────────────┐
         │   Unified Context Memory Service   │
         │   (Lives in Platform)              │
         └───────────────────────────────────┘
                         ↓
        ┌────────────────┴────────────────┐
        ↓                                  ↓
┌───────────────┐                 ┌───────────────┐
│  Demo Chat    │                 │   Platform    │
│  (Port 3000)  │                 │  (Port 3002)  │
│               │                 │               │
│ Reads/Writes  │                 │ Reads/Writes  │
│ User Context  │                 │ User Context  │
└───────────────┘                 └───────────────┘
```

## Key Features

### 🎯 Multi-Agent Support
- Each agent (demo-chat, platform, docs-chat) can store and retrieve context
- Cross-agent search enables finding relevant information across all agents
- Agent-specific filtering for targeted searches

### 🔒 Governance & Security
- PII detection and redaction using GovernsAI precheck
- Content filtering and blocking for sensitive information
- Audit logging for all context access

### 🧮 Semantic Search
- OpenAI embeddings for intelligent similarity matching
- Recency boost for recent content
- Configurable similarity thresholds

### 📊 Rich Metadata
- Conversation tracking
- Agent attribution
- Content type classification
- Scope and visibility controls

## Database Schema

### Core Models

#### ContextMemory
```typescript
{
  id: string;
  userId: string;
  orgId: string;
  content: string;
  contentType: 'user_message' | 'agent_message' | 'document' | 'decision' | 'tool_result';
  agentId: string; // 'demo-chat', 'platform', 'docs-chat'
  agentName: string;
  embedding: number[]; // Vector embedding
  conversationId?: string;
  parentId?: string;
  correlationId?: string;
  metadata: Record<string, any>;
  scope: 'user' | 'org';
  visibility: 'private' | 'team' | 'org';
  // Governance fields
  piiDetected: boolean;
  piiRedacted: boolean;
  rawContent?: string;
  precheckDecision?: string;
}
```

#### Conversation
```typescript
{
  id: string;
  userId: string;
  orgId: string;
  agentId: string;
  agentName: string;
  title?: string;
  summary?: string;
  messageCount: number;
  tokenCount: number;
  cost: number;
  tags: string[];
  scope: 'user' | 'org';
}
```

#### Document (RAG Support)
```typescript
{
  id: string;
  userId: string;
  orgId: string;
  filename: string;
  contentType: string;
  fileSize: number;
  fileHash: string;
  storageUrl?: string;
  content?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunkCount: number;
  scope: 'org';
  visibility: 'org';
}
```

## API Usage

### Store Context

```typescript
POST /api/v1/context
{
  "content": "User needs help with React authentication",
  "contentType": "user_message",
  "agentId": "demo-chat",
  "agentName": "Demo Chat Assistant",
  "conversationId": "conv-123",
  "metadata": {
    "sessionId": "session-456",
    "feature": "authentication"
  },
  "scope": "user",
  "visibility": "private"
}
```

### Search Context

```typescript
POST /api/v1/context/search
{
  "query": "React authentication JWT tokens",
  "agentId": "demo-chat", // Optional: filter by agent
  "contentTypes": ["user_message", "agent_message"],
  "scope": "user", // 'user', 'org', or 'both'
  "limit": 10,
  "threshold": 0.7
}
```

### Cross-Agent Search

```typescript
POST /api/v1/context/cross-agent
{
  "query": "authentication flow",
  "scope": "user",
  "limit": 5,
  "threshold": 0.6
}
```

### Conversation Management

```typescript
// Get conversation context
GET /api/v1/context/conversation?conversationId=conv-123&agentId=demo-chat&limit=50

// Create/get conversation
POST /api/v1/context/conversation
{
  "agentId": "demo-chat",
  "agentName": "Demo Chat Assistant",
  "title": "Authentication Help Session"
}
```

## Service Usage

### UnifiedContextService

```typescript
import { unifiedContext } from '@/lib/services/unified-context';

// Store context
const contextId = await unifiedContext.storeContext({
  userId: 'user-123',
  orgId: 'org-456',
  content: 'User needs help with React',
  contentType: 'user_message',
  agentId: 'demo-chat',
  agentName: 'Demo Chat Assistant',
  metadata: { sessionId: 'session-789' }
});

// Search context
const results = await unifiedContext.searchContext({
  userId: 'user-123',
  orgId: 'org-456',
  query: 'React authentication',
  agentId: 'demo-chat',
  limit: 10,
  threshold: 0.7
});

// Cross-agent search
const crossResults = await unifiedContext.searchCrossAgent(
  'user-123',
  'org-456',
  'authentication flow',
  { limit: 5, threshold: 0.6 }
);

// Get conversation
const conversation = await unifiedContext.getOrCreateConversation(
  'user-123',
  'org-456',
  'demo-chat',
  'Demo Chat Assistant',
  'Authentication Help'
);
```

## Integration Examples

### Demo Chat App Integration

```typescript
// In your chat component
const storeUserMessage = async (message: string) => {
  const response = await fetch('/api/v1/context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message,
      contentType: 'user_message',
      agentId: 'demo-chat',
      agentName: 'Demo Chat Assistant',
      conversationId: currentConversationId,
      metadata: { sessionId: session.id }
    })
  });
  return response.json();
};

const searchRelevantContext = async (query: string) => {
  const response = await fetch('/api/v1/context/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      agentId: 'demo-chat',
      limit: 5,
      threshold: 0.7
    })
  });
  return response.json();
};
```

### Platform Dashboard Integration

```typescript
// Store decision context
const storeDecision = async (decision: string, correlationId: string) => {
  const response = await fetch('/api/v1/context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: decision,
      contentType: 'decision',
      agentId: 'platform',
      agentName: 'Platform Assistant',
      correlationId,
      metadata: { 
        decisionType: 'tool_access',
        environment: 'production'
      }
    })
  });
  return response.json();
};
```

## PII Detection & Governance

The system automatically detects and handles PII:

```typescript
// PII patterns detected:
- Email addresses: user@example.com
- Phone numbers: 555-123-4567
- SSN: 123-45-6789
- Credit cards: 4111-1111-1111-1111
- Sensitive keywords: password, secret, token

// Actions taken:
- 'allow': Content is safe to store
- 'redact': PII detected and redacted, original stored separately
- 'block': High-risk content blocked from storage
```

## Embedding Providers 🧠

The system supports multiple embedding providers for flexibility and cost optimization:

### Supported Providers
- **OpenAI** (default): `text-embedding-3-small`, high accuracy
- **Ollama** (local): `nomic-embed-text`, `mxbai-embed-large`, free & private
- **Hugging Face**: `sentence-transformers/all-MiniLM-L6-v2`, open source
- **Cohere**: `embed-english-v3.0`, enterprise features

### Configuration
```bash
# OpenAI (default)
OPENAI_API_KEY="your-key"

# Ollama (local development)
EMBEDDING_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# Hugging Face
EMBEDDING_PROVIDER="huggingface"
HUGGINGFACE_API_KEY="your-key"

# Cohere
EMBEDDING_PROVIDER="cohere"
COHERE_API_KEY="your-key"
```

### Setup Ollama (Recommended for Development)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull embedding models
ollama pull nomic-embed-text
ollama pull mxbai-embed-large

# Start server
ollama serve
```

## Performance Considerations

### Embedding Generation
- Automatic provider selection based on environment
- Content limited to provider-specific token limits
- Embeddings cached in database
- Support for different embedding dimensions

### Search Optimization
- Pre-filters by user/org scope
- Limits initial fetch to 100 records
- In-memory similarity calculation (MVP)
- TODO: Implement pgvector for native similarity search

### Cleanup
- Automatic archiving of old context (90+ days)
- Configurable TTL for temporary context
- Batch processing for large datasets

## Security & Privacy

### Data Protection
- All content goes through PII precheck
- Redacted content stored separately
- Audit logging for compliance
- Scope-based access control

### Access Control
- User-scoped: Only accessible by the user
- Org-scoped: Accessible by organization members
- Visibility levels: private, team, org

## Future Enhancements

### Vector Database Integration
- Replace in-memory similarity with pgvector
- Support for larger embedding dimensions
- Advanced similarity algorithms

### RAG Document Processing
- Automatic document chunking
- PDF/text extraction
- Document embedding generation
- Hybrid search (semantic + keyword)

### Advanced Features
- Context summarization
- Automatic conversation threading
- Cross-org context sharing
- Real-time context updates via WebSocket

## Testing

Run the test script to verify the system:

```bash
cd apps/platform
npx tsx scripts/test-context-memory.ts
```

This will test:
- Context storage across agents
- Semantic search
- PII detection
- Conversation management
- Cross-agent search

## Monitoring & Analytics

### Metrics to Track
- Context storage rate
- Search success rate
- PII detection rate
- Cross-agent usage
- Performance metrics

### Logging
- All context access logged
- Search queries tracked
- PII detection events
- Performance metrics

## Troubleshooting

### Common Issues

1. **Embedding Generation Fails**
   - Check OpenAI API key
   - Verify content length limits
   - Check network connectivity

2. **Search Returns No Results**
   - Lower similarity threshold
   - Check scope settings
   - Verify agent filters

3. **PII Detection Issues**
   - Review precheck patterns
   - Check content format
   - Verify precheck service

### Debug Mode

Enable debug logging:

```typescript
// In your environment
DEBUG=context-memory:*
```

This will log:
- Embedding generation
- Search queries
- PII detection results
- Performance metrics
