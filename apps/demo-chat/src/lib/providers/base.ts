import { Message } from '../types';

export interface ChatProvider {
  /**
   * Stream chat completion tokens from the provider
   * @param messages - Array of chat messages
   * @param model - Optional model name override
   * @returns AsyncGenerator yielding text tokens
   */
  stream(messages: Message[], model?: string): AsyncGenerator<string>;
  
  /**
   * Get the default model for this provider
   */
  getDefaultModel(): string;
  
  /**
   * Get the provider name
   */
  getName(): string;
}
