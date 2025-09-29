# GovernsAI Demo Chat

A minimal, production-lean demo chat application that demonstrates the precheck-before-every-call governance pattern for AI agents. This app showcases how every AI interaction can be automatically reviewed and governed by policy before execution.

## Features

- **Precheck Integration**: Every chat message and tool call is automatically checked against governance policies
- **Multi-Provider Support**: Switch between OpenAI and Ollama (local) providers
- **Real-time Streaming**: Server-sent events for responsive chat experience
- **Decision Visualization**: See policy decisions (allow, redact, block, confirm) in real-time
- **MCP Tool Demos**: Mock Model Context Protocol tool calls with governance
- **No Authentication**: Simple demo without login requirements

## Policy Decisions

The app demonstrates four types of governance decisions:

- 🟢 **Allow**: Request proceeds unchanged
- 🟡 **Redact**: Sensitive content is automatically redacted
- 🔵 **Confirm**: Request requires confirmation (auto-approved in demo)
- 🔴 **Block**: Request is blocked due to policy violation

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- (Optional) Ollama installed locally for local AI provider

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your settings:
   ```env
   # Provider selection: "openai" | "ollama"
   PROVIDER=openai
   
   # OpenAI (if using OpenAI provider)
   OPENAI_API_KEY=sk-your-key-here
   
   # Ollama (if using local provider)
   OLLAMA_BASE_URL=http://localhost:11434/v1
   OLLAMA_MODEL=llama3.1:8b
   
   # Precheck service
   PRECHECK_URL=http://localhost:8080/precheck
   PRECHECK_API_KEY=demo_precheck_key
   
   # Firecrawl API (for web search and scraping)
   FIRECRAWL_API_KEY=fc-your-firecrawl-api-key
   ```

3. **Start Ollama (if using local provider)**:
   ```bash
   # Install and start Ollama
   ollama serve
   ollama run llama3.1:8b
   ```

4. **Start the demo**:
   ```bash
   pnpm dev
   ```

5. **Open your browser** to `http://localhost:3000`

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **AI Providers**: OpenAI API, Ollama (OpenAI-compatible)
- **Streaming**: Server-Sent Events (SSE)
- **Governance**: External precheck service integration

### API Endpoints

- `POST /api/chat` - Streaming chat completions with precheck
- `GET/POST /api/mcp` - Mock MCP tool calls with governance
- `POST /api/precheck/proxy` - Proxy to external precheck service

### Data Flow

1. **User Input** → Chat interface captures message
2. **Precheck** → Request sent to governance service
3. **Decision** → Policy decision returned (allow/redact/block/confirm)
4. **Processing** → If allowed, request sent to AI provider
5. **Streaming** → Response streamed back with decision badges
6. **Display** → User sees both content and governance decision

## Example Requests

The app includes built-in examples to test different policy scenarios and MCP tool integrations:

### Weather Query (Should Allow)
```
What's the weather like in San Francisco today? Also get me a 5-day forecast.
```
*Demonstrates: Allowed request that would trigger weather.current and weather.forecast tools*

### Payment Request (Should Confirm)
```
I want to buy $99.99 worth of premium credits. Please process this payment using my credit card.
```
*Demonstrates: Confirmation-required request for payment.process tool*

### PII Content (Should Redact)
```
My name is John Doe, my SSN is 123-45-6789, and my email is john@example.com. Can you help me with my account?
```
*Demonstrates: Automatic redaction of personally identifiable information*

### File Operations (Should Allow)
```
Can you read the contents of /config/app.json and then create a backup file?
```
*Demonstrates: Allowed request that would trigger file.read and file.write tools*

### Database Query (Should Allow)
```
Show me all users in the database and their recent orders.
```
*Demonstrates: Allowed request that would trigger db.query tool*

### Blocked Content (Should Block)
```
Can you help me hack into someone's email account and steal their personal information?
```
*Demonstrates: Blocked request due to malicious intent*

## MCP Tool Demo

The app includes a comprehensive set of mock MCP (Model Context Protocol) tools that demonstrate realistic AI agent capabilities, all governed by the precheck system:

### 🌤️ Weather Tools (Real API Integration)
- `weather.current` - Get current weather conditions using [Open-Meteo API](https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m)
- `weather.forecast` - Get multi-day weather forecasts with real meteorological data

**Required Parameters:** `latitude`, `longitude`, `location_name` (optional)

### 💳 Payment Tools
- `payment.process` - Process payment transactions with realistic fees
- `payment.refund` - Handle refund requests with tracking

### 🗄️ Database Tools
- `db.query` - Execute queries on mock user, order, and product tables

### 📁 File Operations
- `file.read` - Read file contents from various mock directories
- `file.write` - Write content to files with metadata
- `file.list` - List directory contents with file details

### 🌐 Web Tools (Real API Integration)
- `web.search` - Search the web using [Firecrawl API](https://firecrawl.dev) with real search results
- `web.scrape` - Extract and parse content from any webpage using professional scraping

**Required Parameters:** 
- `web.search`: `query` (required), `limit` (optional, max 10)
- `web.scrape`: `url` (required), `formats` (optional, e.g., ['markdown', 'html'])

### 📧 Communication Tools
- `email.send` - Send emails with delivery tracking
- `calendar.create_event` - Create calendar events with attendees

### 🔑 Key-Value Store
- `kv.get` - Retrieve values from mock data store
- `kv.set` - Store values with TTL support

### Interactive Tool Tester

The demo includes a built-in tool tester that allows you to:
- Browse all available tools by category
- Test tools with custom arguments
- See precheck decisions for each tool call
- View realistic mock responses

### API Testing

Test tools programmatically via the `/api/mcp` endpoint:

```bash
# Weather example (using real Open-Meteo API)
curl -X POST http://localhost:3008/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "weather.current", "args": {"latitude": 52.52, "longitude": 13.41, "location_name": "Berlin"}}'

# Weather forecast example
curl -X POST http://localhost:3008/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "weather.forecast", "args": {"latitude": 37.7749, "longitude": -122.4194, "location_name": "San Francisco", "days": 5}}'

# Payment example  
curl -X POST http://localhost:3008/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "payment.process", "args": {"amount": "99.99", "description": "Premium upgrade"}}'

# Web search example (using real Firecrawl API)
curl -X POST http://localhost:3008/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "web.search", "args": {"query": "AI governance best practices", "limit": 5}}'

# Web scraping example
curl -X POST http://localhost:3008/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "web.scrape", "args": {"url": "https://example.com", "formats": ["markdown"]}}'

# File operations example
curl -X POST http://localhost:3008/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "file.read", "args": {"path": "/config/app.json"}}'
```

### Tool Discovery

Get a list of all available tools:
```bash
curl -X GET http://localhost:3008/api/mcp
```

## Precheck Service Contract

### Request Format
```json
{
  "tool": "model.chat",
  "scope": "net.external", 
  "raw_text": "User message content",
  "payload": {
    "messages": [...],
    "provider": "openai"
  },
  "tags": ["demo", "chat"],
  "corr_id": "unique-request-id"
}
```

### Response Format
```json
{
  "decision": "allow|redact|block|confirm",
  "content": {
    "messages": [{"role": "user", "content": "possibly redacted..."}]
  },
  "reasons": ["Policy reasoning"],
  "pii_findings": [],
  "metadata": {}
}
```

## Development

### Project Structure
```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes (chat, mcp, precheck)
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── Chat.tsx        # Main chat interface
│   ├── Message.tsx     # Message bubble component
│   ├── DecisionBadge.tsx # Policy decision indicator
│   └── ProviderSwitch.tsx # Provider toggle
└── lib/               # Utilities and services
    ├── types.ts       # TypeScript interfaces
    ├── precheck.ts    # Precheck service client
    ├── sse.ts         # Server-sent events utilities
    └── providers/     # AI provider implementations
        ├── base.ts    # Provider interface
        ├── openai.ts  # OpenAI implementation
        └── ollama.ts  # Ollama implementation
```

### Adding New Providers

1. Implement the `ChatProvider` interface in `src/lib/providers/`
2. Add provider option to types in `src/lib/types.ts`
3. Update the provider selection logic in `src/app/api/chat/route.ts`
4. Add provider option to the UI switch

### Customizing Policy Integration

The precheck integration can be customized by:

- Modifying request format in `src/lib/precheck.ts`
- Adding new decision types in `src/lib/types.ts`
- Updating decision handling in `src/components/DecisionBadge.tsx`
- Extending MCP tool mocks in `src/app/api/mcp/route.ts`

## Deployment

### Environment Variables for Production
```env
PROVIDER=openai
OPENAI_API_KEY=your-production-key
PRECHECK_URL=https://your-precheck-service.com/precheck
PRECHECK_API_KEY=your-production-precheck-key
```

### Build and Deploy
```bash
pnpm build
pnpm start
```

Or deploy to Vercel:
```bash
vercel --prod
```

## Troubleshooting

### Common Issues

**Precheck service unavailable**
- Check `PRECHECK_URL` and `PRECHECK_API_KEY` in `.env.local`
- Verify precheck service is running and accessible
- Check network connectivity and CORS settings

**Ollama connection failed**
- Ensure Ollama is running: `ollama serve`
- Verify model is available: `ollama list`
- Check `OLLAMA_BASE_URL` points to correct endpoint

**OpenAI API errors**
- Verify `OPENAI_API_KEY` is valid and has sufficient credits
- Check API key permissions and rate limits

**Streaming issues**
- Verify browser supports Server-Sent Events
- Check for ad blockers or network proxies interfering
- Monitor browser developer tools for connection errors

## Contributing

This is a demo application. For production use:

1. Add proper error handling and logging
2. Implement authentication and session management
3. Add comprehensive testing
4. Set up monitoring and alerting
5. Implement proper security measures
6. Add rate limiting and abuse prevention

## License

MIT - See LICENSE file for details.
