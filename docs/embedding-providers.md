# Embedding Providers Configuration 🧠

The Unified Context Memory System supports multiple embedding providers, making it flexible for different deployment scenarios and cost considerations.

## Supported Providers

### 1. OpenAI (Default)
**Best for**: Production, high accuracy requirements
**Cost**: ~$0.0001 per 1K tokens
**Dimensions**: 1536

```bash
# Environment variables
OPENAI_API_KEY="your-openai-api-key"
# EMBEDDING_PROVIDER="openai" # Optional, defaults to openai
```

**Models available**:
- `text-embedding-3-small` (recommended, cheaper)
- `text-embedding-ada-002` (legacy)

### 2. Ollama (Local Development)
**Best for**: Local development, privacy, cost control
**Cost**: Free (self-hosted)
**Dimensions**: 768 (nomic-embed-text) or 1024 (mxbai-embed-large)

```bash
# Environment variables
EMBEDDING_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text" # or "mxbai-embed-large"
```

**Setup Ollama**:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull embedding models
ollama pull nomic-embed-text
ollama pull mxbai-embed-large

# Start Ollama server
ollama serve
```

**Models available**:
- `nomic-embed-text` (768 dimensions, faster)
- `mxbai-embed-large` (1024 dimensions, more accurate)

### 3. Hugging Face
**Best for**: Open source, cost-effective
**Cost**: Free tier available, then pay-per-use
**Dimensions**: 384 (MiniLM) or 768 (mpnet)

```bash
# Environment variables
EMBEDDING_PROVIDER="huggingface"
HUGGINGFACE_API_KEY="your-huggingface-api-key"
HUGGINGFACE_EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

**Models available**:
- `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- `sentence-transformers/all-mpnet-base-v2` (768 dimensions)

### 4. Cohere
**Best for**: Enterprise, multilingual support
**Cost**: ~$0.0001 per 1K tokens
**Dimensions**: 1024

```bash
# Environment variables
EMBEDDING_PROVIDER="cohere"
COHERE_API_KEY="your-cohere-api-key"
```

## Configuration Examples

### Development Setup (Ollama)
```typescript
// .env
EMBEDDING_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"
```

### Production Setup (OpenAI)
```typescript
// .env
OPENAI_API_KEY="sk-..."
# Uses default OpenAI configuration
```

### Cost-Conscious Setup (Hugging Face)
```typescript
// .env
EMBEDDING_PROVIDER="huggingface"
HUGGINGFACE_API_KEY="hf_..."
HUGGINGFACE_EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

## Programmatic Configuration

You can also configure the embedding service programmatically:

```typescript
import { createEmbeddingService, embeddingConfigs } from '@/lib/services/embedding-service';

// Use Ollama
const ollamaService = createEmbeddingService({
  ...embeddingConfigs.ollama,
  baseUrl: 'http://localhost:11434',
  model: 'nomic-embed-text',
});

// Use OpenAI
const openaiService = createEmbeddingService({
  ...embeddingConfigs.openai,
  model: 'text-embedding-3-small',
});

// Use Hugging Face
const hfService = createEmbeddingService({
  ...embeddingConfigs.huggingface,
  model: 'sentence-transformers/all-mpnet-base-v2',
});
```

## Performance Comparison

| Provider | Speed | Accuracy | Cost | Privacy | Setup |
|----------|-------|----------|------|---------|-------|
| OpenAI | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Ollama | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Hugging Face | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Cohere | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

## Migration Between Providers

The system automatically handles different embedding dimensions, but you should be aware of compatibility:

### Same Dimensions (Easy Migration)
- OpenAI → Cohere (both 1024+ dimensions)
- Hugging Face mpnet → OpenAI (both 768+ dimensions)

### Different Dimensions (Requires Re-embedding)
- OpenAI → Ollama nomic (1536 → 768)
- Hugging Face MiniLM → OpenAI (384 → 1536)

### Migration Script
```typescript
// Re-embed all existing contexts with new provider
import { unifiedContext } from '@/lib/services/unified-context';

async function migrateEmbeddings() {
  const contexts = await db.contextMemory.findMany({
    where: { embedding: { not: null } },
    select: { id: true, content: true }
  });

  for (const context of contexts) {
    const newEmbedding = await unifiedContext.generateEmbedding(context.content);
    await db.contextMemory.update({
      where: { id: context.id },
      data: { embedding: newEmbedding }
    });
  }
}
```

## Best Practices

### Development
- Use Ollama for local development (free, private)
- Start with `nomic-embed-text` for speed
- Switch to `mxbai-embed-large` for better accuracy

### Production
- Use OpenAI for highest accuracy
- Consider Hugging Face for cost savings
- Use Cohere for enterprise features

### Hybrid Approach
```typescript
// Use different providers for different use cases
const developmentService = createEmbeddingService(embeddingConfigs.ollama);
const productionService = createEmbeddingService(embeddingConfigs.openai);

// Switch based on environment
const embeddingService = process.env.NODE_ENV === 'production' 
  ? productionService 
  : developmentService;
```

## Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Check available models
ollama list

# Pull model if missing
ollama pull nomic-embed-text
```

### API Key Issues
```bash
# Test OpenAI
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Test Hugging Face
curl -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2
```

### Dimension Mismatch
If you get dimension errors, you need to re-embed existing data:
```typescript
// Check current embedding dimensions
const sample = await db.contextMemory.findFirst({
  where: { embedding: { not: null } },
  select: { embedding: true }
});

console.log('Current dimensions:', sample?.embedding?.length);
console.log('Expected dimensions:', embeddingService.getDimensions());
```

## Cost Analysis

### OpenAI
- $0.0001 per 1K tokens
- ~1 token = 4 characters
- 1MB text ≈ $0.25

### Ollama
- Free (self-hosted)
- Requires GPU/CPU resources
- ~$0.10/hour for GPU instance

### Hugging Face
- Free tier: 1K requests/month
- Paid: $0.0001 per 1K tokens
- Similar to OpenAI pricing

### Cohere
- $0.0001 per 1K tokens
- Similar to OpenAI pricing
- Better for multilingual content
