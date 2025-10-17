# GovernsAI SDK Generation Specification

## Project Overview

GovernsAI is a comprehensive AI governance platform that provides secure control over AI interactions, budget management, and policy enforcement. This document provides complete specifications for generating a TypeScript SDK that abstracts all API interactions.

## Architecture Summary

### Current Structure

- **Monorepo**: Turborepo with pnpm workspaces
- **Platform App** (Port 3002): Main dashboard and API backend
- **Demo-Chat App** (Port 3001): Demo application showing API usage patterns
- **Shared Packages**: UI components, database, common utilities, TypeScript configs

### Key Technologies

- **Frontend**: Next.js 15, TypeScript, React 18, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL with comprehensive schema
- **AI Integration**: OpenAI, Anthropic Claude, Google Gemini
- **Authentication**: NextAuth.js with Google OAuth, Passkey support

## Current API Usage Patterns

### 1. Precheck Integration

**Purpose**: Request validation and budget checking before AI calls

**Current Implementation**:

```typescript
// apps/demo-chat/src/lib/precheck.ts
export async function precheck(
  input: PrecheckRequest,
  userId?: string,
  apiKey?: string
): Promise<PrecheckResponse>;

// Usage in demo-chat
const precheckResponse = await precheck(precheckRequest, userId, apiKey);
```

**API Endpoint**: `POST /api/v1/precheck`
**Headers**: `X-Governs-Key: <api-key>`
**Request Body**:

```typescript
interface PrecheckRequest {
  tool: string;
  scope: string;
  raw_text?: string;
  payload?: any;
  tags?: string[];
  corr_id?: string;
  policy_config?: PolicyConfig;
  tool_config?: ToolConfigMetadata;
  budget_context?: any;
}
```

**Response**:

```typescript
interface PrecheckResponse {
  decision: "allow" | "deny" | "confirm";
  raw_text_out?: string;
  reasons?: string[];
  policy_id?: string;
  ts?: number;
  budget_status?: BudgetStatus;
  budget_info?: BudgetInfo;
}
```

### 2. Confirmation Workflows

**Purpose**: User approval for sensitive operations

**Current Implementation**:

```typescript
// Create confirmation
const confirmationResponse = await fetch(
  `${platformUrl}/api/v1/confirmation/create`,
  {
    method: "POST",
    headers: { "X-Governs-Key": apiKey },
    body: JSON.stringify({
      correlationId: uuidv4(),
      requestType: "tool_call",
      requestDesc: `Execute tool: ${toolName}`,
      requestPayload: { tool: toolName, args },
      decision: "confirm",
      reasons: ["High risk operation"],
    }),
  }
);

// Poll for status
const statusResponse = await fetch(
  `${platformUrl}/api/v1/confirmation/${correlationId}`
);
```

**API Endpoints**:

- `POST /api/v1/confirmation/create` - Create confirmation request
- `GET /api/v1/confirmation/[correlationId]` - Get confirmation status
- `POST /api/v1/confirmation/verify` - Verify passkey authentication
- `POST /api/v1/confirmation/auth-challenge` - Generate auth challenge

### 3. Budget Management

**Purpose**: Real-time budget checking and usage tracking

**Current Implementation**:

```typescript
// Get budget context
const budgetContext = await fetchBudgetContext(apiKey);

// Record usage
await recordUsage({
  userId,
  orgId,
  model,
  inputTokens,
  outputTokens,
  cost,
  costType,
});
```

**API Endpoints**:

- `GET /api/v1/budget/context` - Get budget information  
- `POST /api/v1/usage` - Record usage
- `GET /api/v1/usage` - Get usage records
- `GET /api/v1/spend` - Get spend analytics
- `GET /api/v1/spend/budget-limits` - Get budget limits
- `POST /api/v1/spend/budget-limits` - Create budget limits
- `GET /api/v1/purchases` - Get purchase records
- `POST /api/v1/purchases` - Record a purchase

### 4. Tool Management

**Purpose**: Tool registration and metadata handling

**Current Implementation**:

```typescript
// Register tools with platform
await registerToolsWithMetadata(AVAILABLE_TOOLS);
await registerAgentTools(toolNames);

// Get tool metadata
const toolMetadata = getToolMetadataFromPlatform(
  toolName,
  platformToolMetadata
);
```

**API Endpoints**:

- `GET /api/v1/tools` - List tools
- `POST /api/v1/tools` - Create/update tool configuration
- `GET /api/agents/tools` - Get agent tools
- `POST /api/agents/tools` - Register agent tools
- `POST /api/agents/tools/register` - Register tools with metadata

### 5. Dashboard Analytics

**Purpose**: Comprehensive analytics and monitoring

**Current Implementation**:

```typescript
// Fetch dashboard data
const decisionsResponse = await fetch(
  `/api/v1/decisions?orgId=${orgId}&includeStats=true`
);
const toolCallsResponse = await fetch(
  `/api/v1/toolcalls?orgId=${orgId}&includeStats=true`
);
const spendResponse = await fetch(
  `/api/v1/spend?orgSlug=${orgSlug}&timeRange=${timeRange}`
);
```

**API Endpoints**:

- `GET /api/v1/decisions` - Get decision events with filtering
- `GET /api/v1/toolcalls` - Get tool call analytics
- `GET /api/v1/spend` - Get spend analytics
- `GET /api/v1/spend/tool-costs` - Get tool usage costs
- `GET /api/v1/spend/model-costs` - Get model usage costs
- `GET /api/v1/profile` - Get user profile and organizations

### 6. Authentication & Authorization

**Purpose**: User authentication and session management

**Current Implementation**:

```typescript
// Session-based auth
const response = await fetch("/api/v1/profile", {
  method: "GET",
  credentials: "include",
});

// API key auth
const response = await fetch("/api/endpoint", {
  headers: { "X-Governs-Key": apiKey },
});
```

**API Endpoints**:

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/profile` - Get user profile
- `PUT /api/v1/profile` - Update user profile
- `GET /api/v1/keys` - List API keys
- `POST /api/v1/keys` - Create API key
- `DELETE /api/v1/keys/[id]` - Delete API key

## SDK Structure Requirements

### 1. Core SDK Client

```typescript
export class GovernsAIClient {
  constructor(config: GovernsAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "http://localhost:3002";
    this.orgId = config.orgId;
  }

  // Core methods - userId passed per request
  async precheck(
    request: PrecheckRequest,
    userId: string
  ): Promise<PrecheckResponse>;
  async confirm(
    correlationId: string,
    userId: string
  ): Promise<ConfirmationResponse>;
  async recordUsage(usage: UsageRecord): Promise<void>; // userId in usage object
  async getBudgetContext(userId: string): Promise<BudgetContext>;

  // Tool management
  async registerTools(tools: Tool[], userId: string): Promise<void>;
  async getToolMetadata(toolName: string): Promise<ToolMetadata>;

  // Policy management
  async getPolicies(): Promise<Policy[]>;
  async updatePolicy(policy: Policy): Promise<void>;

  // Analytics - userId optional for org-level analytics
  async getDecisions(
    filters: DecisionFilters,
    userId?: string
  ): Promise<DecisionData>;
  async getSpendAnalytics(
    timeRange: string,
    userId?: string
  ): Promise<SpendData>;
  async getToolCalls(
    filters: ToolCallFilters,
    userId?: string
  ): Promise<ToolCallData>;
}
```

### 2. Configuration Interface

```typescript
interface GovernsAIConfig {
  apiKey: string;
  baseUrl?: string; // Default: 'http://localhost:3002'
  orgId: string; // Required - organization context
  timeout?: number; // Default: 30000
  retries?: number; // Default: 3
  retryDelay?: number; // Default: 1000
}
```

### 3. Feature Modules

#### PrecheckClient

```typescript
export class PrecheckClient {
  async checkRequest(request: PrecheckRequest): Promise<PrecheckResponse>;
  async checkToolCall(tool: string, args: any): Promise<PrecheckResponse>;
  async checkChatMessage(messages: Message[]): Promise<PrecheckResponse>;
}
```

#### ConfirmationClient

```typescript
export class ConfirmationClient {
  async createConfirmation(
    request: ConfirmationRequest
  ): Promise<ConfirmationResponse>;
  async getConfirmationStatus(
    correlationId: string
  ): Promise<ConfirmationStatus>;
  async approveConfirmation(correlationId: string): Promise<void>;
  async pollConfirmation(
    correlationId: string,
    callback: (status: string) => void
  ): Promise<void>;
}
```

#### BudgetClient

```typescript
export class BudgetClient {
  async getBudgetContext(): Promise<BudgetContext>;
  async checkBudget(estimatedCost: number): Promise<BudgetStatus>;
  async recordUsage(usage: UsageRecord): Promise<void>;
  async recordPurchase(purchase: PurchaseRecord): Promise<void>;
  async getBudgetLimits(): Promise<BudgetLimit[]>;
  async createBudgetLimit(
    limit: CreateBudgetLimitRequest
  ): Promise<BudgetLimit>;
}
```

#### ToolClient

```typescript
export class ToolClient {
  async registerTools(tools: Tool[]): Promise<void>;
  async getToolMetadata(toolName: string): Promise<ToolMetadata>;
  async executeTool(tool: string, args: any): Promise<ToolResult>;
  async listTools(filters?: ToolFilters): Promise<Tool[]>;
}
```

#### AnalyticsClient

```typescript
export class AnalyticsClient {
  async getDecisions(filters: DecisionFilters): Promise<DecisionData>;
  async getToolCalls(filters: ToolCallFilters): Promise<ToolCallData>;
  async getSpendAnalytics(timeRange: string): Promise<SpendData>;
  async getUsageRecords(filters: UsageFilters): Promise<UsageRecord[]>;
}
```

#### ContextClient (Unified Context Memory)

Purpose: First-class SDK wrapper for Platform Context Memory APIs. No separate client package required; include in `@governs-ai/sdk`.

Endpoints consumed:
- `POST /api/v1/context` (store context)
- `POST /api/v1/context/search/llm` (compressed search for LLM consumption)
- `GET /api/v1/context/conversation` (get conversation items)
- `POST /api/v1/context/conversation` (get or create conversation)

Note: `POST /api/v1/context/search` (full format with stats) is platform-only and not exposed via SDK.

SDK surface:
```typescript
export class ContextClient {
  /** Explicitly save context (client-initiated, e.g., user clicks "Remember this") */
  async saveContextExplicit(input: {
    content: string;
    contentType: 'user_message' | 'agent_message' | 'document' | 'decision' | 'tool_result';
    agentId: string;
    agentName?: string;
    conversationId?: string;
    parentId?: string;
    correlationId?: string; // idempotency
    metadata?: Record<string, any>;
    scope?: 'user' | 'org';
    visibility?: 'private' | 'team' | 'org';
    expiresAt?: string; // ISO
  }): Promise<{ contextId: string }>;

  /** Store a piece of context (runs Platform precheck; will redact/block per policy) */
  async storeContext(input: {
    content: string;
    contentType: 'user_message' | 'agent_message' | 'document' | 'decision' | 'tool_result';
    agentId: string;
    agentName?: string;
    conversationId?: string;
    parentId?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
    scope?: 'user' | 'org';
    visibility?: 'private' | 'team' | 'org';
    expiresAt?: string; // ISO
  }): Promise<{ contextId: string }>;

  /** LLM-optimized context search (compressed format) */
  async searchContextLLM(input: {
    query: string;
    agentId?: string;
    contentTypes?: string[];
    conversationId?: string;
    scope?: 'user' | 'org' | 'both';
    limit?: number;
    threshold?: number; // default 0.5
  }): Promise<{
    success: boolean;
    context: string; // Natural language compressed format
    memoryCount: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    tokenEstimate: number;
  }>;

  /** Cross-agent search convenience (LLM format) */
  async searchCrossAgent(query: string, opts?: {
    limit?: number;
    threshold?: number;
    scope?: 'user' | 'org' | 'both';
  }): Promise<ReturnType<ContextClient['searchContextLLM']>>;

  /** Create or fetch a conversation for an agent */
  async getOrCreateConversation(input: {
    agentId: string;
    agentName: string;
    title?: string;
  }): Promise<{
    id: string;
    title?: string;
    messageCount: number;
    tokenCount: number;
    lastMessageAt?: string;
    scope: 'user' | 'org';
  }>;

  /** Fetch conversation messages */
  async getConversationContext(input: {
    conversationId: string;
    agentId?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    content: string;
    contentType: string;
    agentId?: string;
    createdAt: string;
    parentId?: string;
    metadata?: Record<string, any>;
  }>>;
}
```

Notes:
- Server enforces precheck; SDK just forwards payload and headers (API key/session).
- Search is pgvector-native in Platform; SDK does not compute embeddings.
- All dates in SDK responses are ISO strings.
- saveContextExplicit is a thin alias over POST /api/v1/context for apps that want a UI action (no WebSocket needed).
- Full memory search with stats (`/api/v1/context/search`) is platform-only for dashboard/debugging.
- SDK only exposes LLM-optimized search (`/api/v1/context/search/llm`) for AI agent consumption.

### Precheck intent metadata (for context.save)

Extend Precheck types to carry save intent hints so apps can choose to act on them without keyword heuristics.

```typescript
type SuggestedAction =
  | { type: 'context.save'; content?: string; reason?: string; metadata?: Record<string, any> }
  | { type: string; [k: string]: any };

interface PrecheckResponse {
  decision: 'allow' | 'deny' | 'confirm';
  raw_text_out?: string;
  reasons?: string[];
  policy_id?: string;
  ts?: number;
  budget_status?: BudgetStatus;
  budget_info?: BudgetInfo;
  // New fields
  intent?: { save?: boolean };
  suggestedActions?: SuggestedAction[];
}
```

SDK convenience helper for chat UIs (optional):

```typescript
export class ContextClient {
  /**
   * Inspect a precheck response and, if it suggests a context save, call storeContext.
   * No-op if there is no suggestion. Returns contextId if saved.
   */
  async maybeSaveFromPrecheck(params: {
    precheck: PrecheckResponse;
    fallbackContent?: string; // used if suggested content not provided
    agentId: string;
    agentName?: string;
    conversationId?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
    scope?: 'user' | 'org';
    visibility?: 'private' | 'team' | 'org';
  }): Promise<{ saved: boolean; contextId?: string }>;
}
```

Behavior:
- If `precheck.intent?.save === true` or `suggestedActions` contains `{ type: 'context.save' }`, call `storeContext` with suggested `content` or `fallbackContent`.
- If neither is present, return `{ saved: false }`.

## TypeScript Definitions

### Core Types

```typescript
// Request/Response Types
interface PrecheckRequest {
  tool: string;
  scope: string;
  raw_text?: string;
  payload?: any;
  tags?: string[];
  corr_id?: string;
  policy_config?: PolicyConfig;
  tool_config?: ToolConfigMetadata;
  budget_context?: any;
}

interface PrecheckResponse {
  decision: "allow" | "deny" | "confirm";
  raw_text_out?: string;
  reasons?: string[];
  policy_id?: string;
  ts?: number;
  budget_status?: BudgetStatus;
  budget_info?: BudgetInfo;
}

// Configuration Types
interface PolicyConfig {
  version: string;
  defaults: PolicyDefaults;
  tool_access: Record<string, ToolAccessRule>;
  deny_tools: string[];
  allow_tools?: string[];
  network_scopes: string[];
  network_tools: string[];
  on_error: "block" | "allow" | "redact";
}

interface ToolConfigMetadata {
  tool_name: string;
  scope: string;
  direction: "ingress" | "egress" | "both";
  metadata: {
    category: string;
    risk_level: "low" | "medium" | "high" | "critical";
    requires_approval?: boolean;
  };
}

// Budget Types
interface BudgetContext {
  monthly_limit: number;
  current_spend: number;
  llm_spend: number;
  purchase_spend: number;
  remaining_budget: number;
  budget_type: "user" | "organization";
}

interface BudgetStatus {
  allowed: boolean;
  currentSpend: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  reason?: string;
}

// Usage Types
interface UsageRecord {
  userId: string;
  orgId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  costType: string;
  tool?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  apiKeyId?: string;
}

// Confirmation Types
interface ConfirmationRequest {
  correlationId: string;
  requestType: "tool_call" | "chat" | "mcp";
  requestDesc: string;
  requestPayload: any;
  decision?: string;
  reasons?: string[];
}

interface ConfirmationResponse {
  success: boolean;
  confirmation: {
    id: string;
    correlationId: string;
    requestType: string;
    requestDesc: string;
    decision: string;
    reasons: string[];
    status: string;
    expiresAt: string;
    createdAt: string;
  };
}

// Analytics Types
interface DecisionData {
  decisions: Decision[];
  stats: {
    total: number;
    byDecision: Record<string, number>;
    byDirection: Record<string, number>;
    byTool: Record<string, number>;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface SpendData {
  spend: {
    totalSpend: number;
    monthlySpend: number;
    dailySpend: number;
    toolSpend: Record<string, number>;
    modelSpend: Record<string, number>;
    userSpend: Record<string, number>;
    budgetLimit: number;
    remainingBudget: number;
    isOverBudget: boolean;
  };
}
```

## Error Handling

### Error Types

```typescript
export class GovernsAIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
    public retryable?: boolean
  ) {
    super(message);
    this.name = "GovernsAIError";
  }
}

export class PrecheckError extends GovernsAIError {}
export class ConfirmationError extends GovernsAIError {}
export class BudgetError extends GovernsAIError {}
export class AuthenticationError extends GovernsAIError {}
```

### Retry Logic

```typescript
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: GovernsAIError) => boolean;
}
```

## Environment Configuration

### Required Environment Variables

```bash
# API Configuration
GOVERNS_API_KEY=your_api_key_here
GOVERNS_USER_ID=cmg83v4lf00015q6aweq8i02j
GOVERNS_ORG_ID=cmg83v4ki00005q6app5ouwrw
GOVERNS_BASE_URL=http://localhost:3002

# Optional Configuration
GOVERNS_TIMEOUT=30000
GOVERNS_RETRIES=3
GOVERNS_RETRY_DELAY=1000
```

## Usage Examples

### Basic Setup

```typescript
import { GovernsAIClient } from "@governs-ai/sdk";

const client = new GovernsAIClient({
  apiKey: process.env.GOVERNS_API_KEY!,
  userId: process.env.GOVERNS_USER_ID,
  orgId: process.env.GOVERNS_ORG_ID,
  baseUrl: "http://localhost:3002",
});
```

### Precheck Usage

```typescript
// Check a chat message
const precheckResponse = await client.precheck({
  tool: "model.chat",
  scope: "net.external",
  raw_text: "Hello, how are you?",
  payload: { messages: [{ role: "user", content: "Hello" }] },
  tags: ["demo", "chat"],
});

if (precheckResponse.decision === "deny") {
  throw new Error(`Request blocked: ${precheckResponse.reasons?.join(", ")}`);
}
```

### Confirmation Flow

```typescript
// Create confirmation for sensitive operation
const confirmation = await client.confirm({
  correlationId: "unique-id",
  requestType: "tool_call",
  requestDesc: "Execute payment tool",
  requestPayload: { tool: "payment_process", args: { amount: 99.99 } },
});

// Poll for approval
await client.pollConfirmation(confirmation.correlationId, (status) => {
  console.log(`Confirmation status: ${status}`);
});
```

### Budget Management

```typescript
// Get budget context
const budgetContext = await client.getBudgetContext();
console.log(`Remaining budget: $${budgetContext.remaining_budget}`);

// Record usage after AI call
await client.recordUsage({
  userId: "user-123",
  orgId: "org-456",
  provider: "openai",
  model: "gpt-4",
  inputTokens: 100,
  outputTokens: 50,
  cost: 0.15,
  costType: "external",
});
```

### Analytics

```typescript
// Get decision analytics
const decisions = await client.getDecisions({
  orgId: "org-456",
  timeRange: "24h",
  includeStats: true,
});

// Get spend analytics
const spendData = await client.getSpendAnalytics("30d");
console.log(`Total spend: $${spendData.spend.totalSpend}`);
```

## Testing Requirements

### Unit Tests

- Test all SDK methods with mocked responses
- Test error handling and retry logic
- Test configuration validation
- Test type safety

### Integration Tests

- Test against real API endpoints
- Test authentication flows
- Test confirmation workflows
- Test budget management

### Example Test

```typescript
describe("GovernsAIClient", () => {
  it("should precheck requests correctly", async () => {
    const client = new GovernsAIClient({
      apiKey: "test-key",
      baseUrl: "http://localhost:3002",
    });

    const response = await client.precheck({
      tool: "model.chat",
      scope: "net.external",
      raw_text: "Test message",
    });

    expect(response.decision).toBeOneOf(["allow", "deny", "confirm"]);
  });
});
```

## Documentation Requirements

### README.md

- Quick start guide
- Installation instructions
- Basic usage examples
- Configuration options
- Error handling guide

### API.md

- Complete API reference
- All method signatures
- Request/response examples
- Error codes and meanings

### MIGRATION.md

- Migration guide from direct API calls
- Code examples showing before/after
- Breaking changes documentation

## Package Structure

```
@governs-ai/sdk/
├── src/
│   ├── client.ts              # Main SDK client
│   ├── precheck.ts            # Precheck functionality
│   ├── confirmation.ts        # Confirmation workflows
│   ├── budget.ts              # Budget management
│   ├── usage.ts               # Usage tracking
│   ├── tools.ts               # Tool management
│   ├── analytics.ts           # Analytics and reporting
│   ├── auth.ts                # Authentication
│   ├── types.ts               # TypeScript definitions
│   ├── errors.ts              # Error handling
│   ├── utils.ts               # Utilities
│   └── index.ts               # Main exports
├── examples/
│   ├── basic-usage.ts
│   ├── chat-integration.ts
│   ├── tool-calling.ts
│   └── dashboard-analytics.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
│   ├── README.md
│   ├── API.md
│   └── MIGRATION.md
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Implementation Priority

### Phase 1: Core SDK (Week 1)

1. Main GovernsAIClient class
2. PrecheckClient module
3. Basic configuration and error handling
4. TypeScript definitions

### Phase 2: Essential Features (Week 2)

1. ConfirmationClient module
2. BudgetClient module
3. UsageClient module
4. Authentication handling

### Phase 3: Advanced Features (Week 3)

1. ToolClient module
2. AnalyticsClient module
3. WebSocket integration
4. Retry logic and caching

### Phase 4: Developer Experience (Week 4)

1. Comprehensive documentation
2. Example applications
3. Migration guides
4. Testing framework

## Success Criteria

1. **Functionality**: All current API patterns abstracted into SDK methods
2. **Type Safety**: Full TypeScript support with comprehensive type definitions
3. **Error Handling**: Robust error handling with retry logic
4. **Documentation**: Complete documentation with examples
5. **Testing**: Comprehensive test coverage
6. **Performance**: Minimal bundle size and fast execution
7. **Developer Experience**: Easy to use and well-documented

This specification provides everything needed to generate a comprehensive GovernsAI SDK that abstracts all current API usage patterns into a developer-friendly interface.
