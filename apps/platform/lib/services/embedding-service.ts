/**
 * Universal Embedding Service
 * 
 * Supports multiple embedding providers:
 * - OpenAI (text-embedding-3-small, text-embedding-ada-002)
 * - Ollama (nomic-embed-text, mxbai-embed-large)
 * - Hugging Face (sentence-transformers)
 * - Cohere (embed-english-v3.0)
 */

export interface EmbeddingProvider {
  name: string;
  generateEmbedding(text: string): Promise<number[]>;
  getDimensions(): number;
  getMaxTokens(): number;
}

export interface EmbeddingConfig {
  provider: 'openai' | 'ollama' | 'huggingface' | 'cohere';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  dimensions?: number;
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private client: any;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    const OpenAI = require('openai');
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'text-embedding-3-small';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text.slice(0, this.getMaxTokens()),
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error('Failed to generate OpenAI embedding');
    }
  }

  getDimensions(): number {
    // text-embedding-3-small: 1536, text-embedding-ada-002: 1536
    return 1536;
  }

  getMaxTokens(): number {
    return 8000; // OpenAI limit
  }
}

class OllamaEmbeddingProvider implements EmbeddingProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(config: { baseUrl?: string; model?: string }) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'nomic-embed-text';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text.slice(0, this.getMaxTokens()),
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Ollama embedding error:', error);
      throw new Error('Failed to generate Ollama embedding');
    }
  }

  getDimensions(): number {
    // nomic-embed-text: 768, mxbai-embed-large: 1024
    return this.model.includes('large') ? 1024 : 768;
  }

  getMaxTokens(): number {
    return 8192; // Ollama limit
  }
}

class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  name = 'huggingface';
  private apiKey: string;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'sentence-transformers/all-MiniLM-L6-v2';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text.slice(0, this.getMaxTokens()),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data[0]; // Hugging Face returns array of embeddings
    } catch (error) {
      console.error('Hugging Face embedding error:', error);
      throw new Error('Failed to generate Hugging Face embedding');
    }
  }

  getDimensions(): number {
    // all-MiniLM-L6-v2: 384, all-mpnet-base-v2: 768
    return this.model.includes('mpnet') ? 768 : 384;
  }

  getMaxTokens(): number {
    return 512; // Hugging Face limit
  }
}

class CohereEmbeddingProvider implements EmbeddingProvider {
  name = 'cohere';
  private apiKey: string;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'embed-english-v3.0';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: [text.slice(0, this.getMaxTokens())],
          model: this.model,
          input_type: 'search_document',
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embeddings[0];
    } catch (error) {
      console.error('Cohere embedding error:', error);
      throw new Error('Failed to generate Cohere embedding');
    }
  }

  getDimensions(): number {
    // embed-english-v3.0: 1024
    return 1024;
  }

  getMaxTokens(): number {
    return 512; // Cohere limit
  }
}

export class UniversalEmbeddingService {
  private provider: EmbeddingProvider;

  constructor(config: EmbeddingConfig) {
    switch (config.provider) {
      case 'openai':
        this.provider = new OpenAIEmbeddingProvider({
          apiKey: config.apiKey || process.env.OPENAI_API_KEY!,
          model: config.model,
        });
        break;
      case 'ollama':
        this.provider = new OllamaEmbeddingProvider({
          baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL,
          model: config.model,
        });
        break;
      case 'huggingface':
        this.provider = new HuggingFaceEmbeddingProvider({
          apiKey: config.apiKey || process.env.HUGGINGFACE_API_KEY!,
          model: config.model,
        });
        break;
      case 'cohere':
        this.provider = new CohereEmbeddingProvider({
          apiKey: config.apiKey || process.env.COHERE_API_KEY!,
          model: config.model,
        });
        break;
      default:
        throw new Error(`Unsupported embedding provider: ${config.provider}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.provider.generateEmbedding(text);
  }

  getDimensions(): number {
    return this.provider.getDimensions();
  }

  getMaxTokens(): number {
    return this.provider.getMaxTokens();
  }

  getProviderName(): string {
    return this.provider.name;
  }
}

// Factory function for easy initialization
export function createEmbeddingService(config: EmbeddingConfig): UniversalEmbeddingService {
  return new UniversalEmbeddingService(config);
}

// Default configurations for common setups
export const embeddingConfigs = {
  openai: {
    provider: 'openai' as const,
    model: 'text-embedding-3-small',
  },
  ollama: {
    provider: 'ollama' as const,
    model: 'nomic-embed-text',
    baseUrl: 'http://localhost:11434',
  },
  ollamaLarge: {
    provider: 'ollama' as const,
    model: 'mxbai-embed-large',
    baseUrl: 'http://localhost:11434',
  },
  huggingface: {
    provider: 'huggingface' as const,
    model: 'sentence-transformers/all-MiniLM-L6-v2',
  },
  cohere: {
    provider: 'cohere' as const,
    model: 'embed-english-v3.0',
  },
};
