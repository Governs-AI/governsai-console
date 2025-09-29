import OpenAI from 'openai';
import { ChatProvider } from './base';
import { Message } from '../types';

export class OpenAIProvider implements ChatProvider {
  private client: OpenAI;
  private defaultModel = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.client = new OpenAI({
      apiKey,
    });
  }

  async* stream(messages: Message[], model?: string): AsyncGenerator<string> {
    const modelToUse = model || this.defaultModel;
    
    // Convert our Message format to OpenAI format
    const openaiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    try {
      const stream = await this.client.chat.completions.create({
        model: modelToUse,
        messages: openaiMessages,
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error('Unknown OpenAI API error');
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getName(): string {
    return 'openai';
  }
}
