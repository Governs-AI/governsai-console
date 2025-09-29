import { Message, Tool, ToolCall } from '../types';

export interface ChatProvider {
  /**
   * Stream chat completion tokens from the provider
   * @param messages - Array of chat messages
   * @param model - Optional model name override
   * @param tools - Optional tools for function calling
   * @returns AsyncGenerator yielding text tokens or tool calls
   */
  stream(messages: Message[], model?: string, tools?: Tool[]): AsyncGenerator<{ type: 'content' | 'tool_call', data: any }>;
  
  /**
   * Get the default model for this provider
   */
  getDefaultModel(): string;
  
  /**
   * Get the provider name
   */
  getName(): string;
}
