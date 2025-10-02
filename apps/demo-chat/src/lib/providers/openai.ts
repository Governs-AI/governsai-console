import OpenAI from 'openai';
import { ChatProvider } from './base';
import { Message, Tool, ToolCall } from '../types';

export class OpenAIProvider implements ChatProvider {
  private client: OpenAI;
  private defaultModel = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required. Please set it in your .env.local file. See env.example for reference.');
    }
    
    this.client = new OpenAI({
      apiKey,
    });
  }

  async* stream(messages: Message[], model?: string, tools?: Tool[]): AsyncGenerator<{ type: 'content' | 'tool_call' | 'usage', data: any }> {
    const modelToUse = model || this.defaultModel;
    
    // Convert our Message format to OpenAI format
    const openaiMessages: any[] = [];
    
    for (const msg of messages) {
      const openaiMsg: any = {
        role: msg.role as 'user' | 'assistant' | 'tool' | 'system',
        content: msg.content,
      };

      // Handle tool calls in assistant messages
      if (msg.role === 'assistant' && msg.tool_calls) {
        openaiMsg.tool_calls = msg.tool_calls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          }
        }));
      }

      // Handle tool results
      if (msg.role === 'tool' && msg.tool_call_id) {
        openaiMsg.tool_call_id = msg.tool_call_id;
      }

      openaiMessages.push(openaiMsg);
    }

    try {
      const requestOptions: any = {
        model: modelToUse,
        messages: openaiMessages,
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        console.log('Adding tools to OpenAI request:', tools.length, 'tools');
        requestOptions.tools = tools;
        requestOptions.tool_choice = 'auto'; // Let the model decide when to use tools
      } else {
        console.log('No tools provided to OpenAI request');
      }

      const stream = await this.client.chat.completions.create(requestOptions);
      let hasToolCalls = false;
      let accumulatedContent = '';

      for await (const chunk of stream as any) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;

        // Handle content
        if (delta.content) {
          accumulatedContent += delta.content;
          yield { type: 'content', data: delta.content };
        }

        // Handle tool calls - stop streaming and handle synchronously
        if (delta.tool_calls) {
          console.log('Tool calls detected, stopping stream to handle synchronously');
          hasToolCalls = true;
          break; // Stop streaming when tool calls are detected
        }

        // Handle usage data
        if (chunk.usage) {
          console.log('Usage data received:', chunk.usage);
          yield { 
            type: 'usage', 
            data: {
              prompt_tokens: chunk.usage.prompt_tokens || 0,
              completion_tokens: chunk.usage.completion_tokens || 0,
              total_tokens: chunk.usage.total_tokens || 0
            }
          };
        }
      }

      // If tool calls were detected, make a non-streaming request to get complete tool calls
      if (hasToolCalls) {
        console.log('Making non-streaming request to get complete tool calls');
        
        const nonStreamingOptions = {
          ...requestOptions,
          stream: false,
        };

        const response = await this.client.chat.completions.create(nonStreamingOptions);
        const choice = response.choices[0];

        if (choice.message.tool_calls) {
          console.log('Complete tool calls received:', choice.message.tool_calls);
          
          for (const toolCall of choice.message.tool_calls) {
            if (toolCall.function) {
              const toolCallData: ToolCall = {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments,
                }
              };
              console.log('Yielding complete tool call:', toolCallData);
              yield { type: 'tool_call', data: toolCallData };
            }
          }
        }

        // Yield usage data from the non-streaming response
        if (response.usage) {
          yield { 
            type: 'usage', 
            data: {
              prompt_tokens: response.usage.prompt_tokens || 0,
              completion_tokens: response.usage.completion_tokens || 0,
              total_tokens: response.usage.total_tokens || 0
            }
          };
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
