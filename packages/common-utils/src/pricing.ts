export interface ModelPricing {
  input: number;  // Cost per 1K tokens
  output: number; // Cost per 1K tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
  "gpt-3.5-turbo-16k": { input: 0.003, output: 0.004 },
  
  // Anthropic
  "claude-3-opus": { input: 0.015, output: 0.075 },
  "claude-3-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  
  // Local models (internal pricing - optional)
  "llama2": { input: 0.0001, output: 0.0001 },
  "llama3": { input: 0.0001, output: 0.0001 },
  "mistral": { input: 0.0001, output: 0.0001 },
  "ollama": { input: 0, output: 0 }, // Free but tracked
  "local": { input: 0, output: 0 }, // Free but tracked
};

export function getProvider(model: string): string {
  if (model.startsWith('gpt-')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.includes('llama') || model.includes('mistral') || model.includes('ollama')) return 'ollama';
  return 'unknown';
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    console.warn(`Unknown model pricing: ${model}, assuming free`);
    return 0;
  }
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  
  return inputCost + outputCost;
}

export function getCostType(provider: string): string {
  if (provider === 'ollama' || provider === 'local') return 'free';
  return 'external';
}

/**
 * Rough token estimation for budget checking
 * For accurate counting, use tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Get all available models for a provider
 */
export function getModelsForProvider(provider: string): string[] {
  return Object.keys(MODEL_PRICING).filter(model => getProvider(model) === provider);
}

/**
 * Get pricing information for a specific model
 */
export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING[model] || null;
}
