# Context Save Implementation - Complete ✅

## What Was Implemented

Successfully implemented the **context.save** flow for GovernsAI's Unified Context Memory system. This enables automatic, privacy-first context saving triggered by user intent.

## Architecture

```
Client Message → WebSocket → Detects Keywords → Emits context.save
                                                          ↓
                                                    Platform Webhook
                                                          ↓
                                              Stores Context + Embeddings
                                                          ↓
                                              User Can Search Later
```

## Key Components

### 1. Platform Webhook Handler ✅
**File:** `apps/platform/app/api/governs/webhook/route.ts`

- Handles `context.save` events
- Validates webhook signatures
- Resolves user from API key
- Enforces precheck decisions
- Stores context with pgvector embeddings
- Implements idempotency via correlationId

### 2. WebSocket Service ✅
**File:** `apps/websocket-service/src/websocket/simple-handler.js`

- Detects save intent via keywords
- Emits `context.save` to Platform
- Non-blocking (doesn't delay message flow)

**Keywords that trigger save:**
- "remember this/that"
- "save this/that"
- "don't forget"
- "keep this in mind"
- "note this/that"
- "make a note"
- "store this"

### 3. Environment Configuration ✅

**WebSocket Service:**
```bash
PLATFORM_WEBHOOK_URL=http://localhost:3002/api/governs/webhook
WEBHOOK_SECRET=dev-secret-key-change-in-production
```

**Platform:**
```bash
WEBHOOK_SECRET=dev-secret-key-change-in-production  # Must match WebSocket
OPENAI_API_KEY=sk-...  # Or other embedding provider
PRECHECK_API_KEY=your-key
PRECHECK_URL=http://localhost:3001
```

## Files Changed

### Implementation
1. ✅ `apps/platform/app/api/governs/webhook/route.ts` - Added context.save handler
2. ✅ `apps/websocket-service/src/websocket/simple-handler.js` - Added keyword detection
3. ✅ `apps/websocket-service/env.example` - Updated with webhook config

### Documentation
4. ✅ `docs/environment-variables.md` - Complete env var guide
5. ✅ `docs/context-save-integration-test.md` - Testing guide
6. ✅ `docs/context-save-implementation-summary.md` - Detailed summary

## Event Contract

### context.save Payload

```typescript
{
  type: 'context.save',
  apiKey: string,  // For user/org resolution
  data: {
    content: string,           // Required
    contentType: string,       // Required: 'user_message' | 'agent_message' | etc.
    agentId: string,          // Required
    agentName?: string,
    conversationId?: string,
    correlationId?: string,   // For idempotency
    metadata?: object,
    scope?: 'user' | 'org',   // Default: 'user'
    visibility?: 'private' | 'team' | 'org',  // Default: 'private'
    precheckRef?: {
      decision: 'allow' | 'redact' | 'block' | 'deny',
      redactedContent?: string,
      piiTypes?: string[],
      reasons?: string[]
    }
  }
}
```

### Webhook Signature

```
Header: x-governs-signature
Format: v1,t=TIMESTAMP,s=HMAC_SHA256_HEX
Secret: Shared WEBHOOK_SECRET
```

## User Flow Example

1. **User sends:** "Remember this: I work at Acme Corp"
2. **WebSocket detects:** "Remember this" keyword
3. **WebSocket emits:** context.save to Platform
4. **Platform stores:** Context with embeddings
5. **User asks later:** "Where do I work?"
6. **Platform returns:** "Acme Corp" (via semantic search)

## Features

### ✅ Privacy-First
- User must explicitly say "remember this"
- No automatic background extraction
- Clear intent required

### ✅ PII Protection
- Respects precheck decisions (deny/block = no save)
- Stores redacted content if PII detected
- Preserves original for audit

### ✅ Idempotency
- Uses correlationId for deduplication
- Safe to retry webhook calls

### ✅ Multi-Agent
- Tracks agentId for each context
- Enables cross-agent search

### ✅ Semantic Search
- pgvector-powered similarity search
- Multiple embedding providers
- Configurable threshold

## Testing

### Quick Test
```bash
# 1. Start services
cd apps/platform && pnpm dev
cd apps/websocket-service && pnpm dev

# 2. Send message with keyword
ws.send({
  type: 'INGEST',
  data: { raw_text_in: 'Remember this: test context' }
});

# 3. Check logs for "Context save intent detected"

# 4. Search for saved context
curl -X POST /api/v1/context/search \
  -d '{ "query": "test" }'
```

See `docs/context-save-integration-test.md` for comprehensive testing guide.

## Database

Existing schema supports all features (no migrations needed beyond what's already created):
- ✅ `ContextMemory` with pgvector embeddings
- ✅ Governance fields (piiDetected, piiRedacted)
- ✅ Agent tracking (agentId, agentName)
- ✅ Correlation IDs for idempotency

Migration already created: `packages/db/prisma/migrations/0000_add_context_memory/`

## Setup Checklist

### Prerequisites
- [ ] PostgreSQL with pgvector extension
- [ ] Run: `pnpm db:migrate` (if not already done)
- [ ] Set WEBHOOK_SECRET (same in Platform and WebSocket)
- [ ] Configure embedding provider (OPENAI_API_KEY recommended)

### Deployment
- [ ] Set environment variables (see `docs/environment-variables.md`)
- [ ] Deploy Platform with webhook handler
- [ ] Deploy WebSocket service with keyword detection
- [ ] Test with sample messages
- [ ] Monitor logs for successful saves

## Next Steps

### Immediate
1. Deploy to staging/production
2. Test with real user messages
3. Monitor embedding costs
4. Verify keyword detection accuracy

### Short-term
1. Add context management UI to Platform
2. Implement context deletion API
3. Add usage analytics
4. Create client SDK helpers

### Long-term
1. ML-based intent detection
2. Custom keywords per org
3. Team/org context sharing
4. Advanced search filters

## Troubleshooting

### Context not saving?
1. Check WEBHOOK_SECRET matches in both services
2. Verify PLATFORM_WEBHOOK_URL is correct
3. Check logs for "Context save intent detected"
4. Verify embedding provider is configured

### Webhook signature fails?
1. Ensure WEBHOOK_SECRET is identical
2. Check system clocks are synchronized
3. Verify no middleware modifying request body

### TypeScript errors?
The Prisma client may need to be regenerated:
```bash
cd packages/db
pnpm prisma generate
```

Then restart your IDE/TypeScript server.

## Support

- **Architecture:** `docs/unified-context-memory.md`
- **Testing:** `docs/context-save-integration-test.md`
- **Environment:** `docs/environment-variables.md`
- **Implementation:** `docs/context-save-implementation-summary.md`

---

**Status:** ✅ Complete and Ready for Testing  
**Date:** October 15, 2025

