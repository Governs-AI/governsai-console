import { ChatProvider } from './base';
import { Message, Tool } from '../types';

export class OllamaProvider implements ChatProvider {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  async* stream(messages: Message[], model?: string, tools?: Tool[]): AsyncGenerator<{ type: 'content' | 'tool_call', data: any }> {
    const modelToUse = model || this.defaultModel;
    
    // Convert our Message format to OpenAI-compatible format
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const requestBody: any = {
      model: modelToUse,
      messages: openaiMessages,
      stream: true,
      max_tokens: 1000,
      temperature: 0.7,
    };

    // Add tools if provided (Ollama supports function calling)
    if (tools && tools.length > 0) {
      console.log('Adding tools to Ollama request:', tools.length, 'tools');
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto'; // Let the model decide when to use tools
    } else {
      console.log('No tools provided to Ollama request');
    }

    console.log("----------------- Ollama request body -----------------");
    console.log(`${this.baseUrl}/chat/completions`);
    console.log("----------------- Ollama request body -----------------");

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6); // Remove 'data: ' prefix
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;

              // Handle content
              if (delta?.content) {
                yield { type: 'content', data: delta.content };
              }

              // Handle tool calls
              if (delta?.tool_calls) {
                console.log('Tool calls detected in Ollama delta:', delta.tool_calls);
                for (const toolCall of delta.tool_calls) {
                  if (toolCall.function) {
                    const toolCallData = {
                      id: toolCall.id || '',
                      type: 'function',
                      function: {
                        name: toolCall.function.name || '',
                        arguments: toolCall.function.arguments || '',
                      }
                    };
                    console.log('Yielding tool call from Ollama:', toolCallData);
                    yield { type: 'tool_call', data: toolCallData };
                  }
                }
              }
            } catch (parseError) {
              // Ignore malformed JSON chunks
              console.warn('Failed to parse SSE chunk:', data);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ollama connection error: ${error.message}`);
      }
      throw new Error('Unknown Ollama error');
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getName(): string {
    return 'ollama';
  }
}
