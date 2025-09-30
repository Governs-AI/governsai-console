import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { precheck, createChatPrecheckRequest, createMCPPrecheckRequest } from '@/lib/precheck';
import { OpenAIProvider } from '@/lib/providers/openai';
import { OllamaProvider } from '@/lib/providers/ollama';
import { SSEWriter } from '@/lib/sse';
import { ChatRequest, Provider, Message, ToolCall } from '@/lib/types';
import { getPrecheckUserIdDetails } from '@/lib/utils';
import { AVAILABLE_TOOLS } from '@/lib/tools';

// Helper function to execute tool calls
async function executeToolCall(toolCall: ToolCall, writer: SSEWriter, userId?: string, apiKey?: string) {
  try {
    console.log('Executing tool call:', toolCall.function.name, 'with args:', toolCall.function.arguments);
    
    // Parse tool arguments
    const args = JSON.parse(toolCall.function.arguments);
    
    // Create MCP precheck request for the tool call
    const precheckRequest = createMCPPrecheckRequest(toolCall.function.name, args, uuidv4());
    const precheckResponse = await precheck(precheckRequest, userId, apiKey);
    
    // Send tool call decision
    writer.writeDecision(precheckResponse.decision, precheckResponse.reasons);
    
    // Handle precheck decision
    if (precheckResponse.decision === 'block') {
      writer.writeToolResult({
        tool_call_id: toolCall.id,
        success: false,
        error: `Tool call blocked: ${precheckResponse.reasons?.join(', ') || 'Policy violation'}`,
        decision: precheckResponse.decision,
        reasons: precheckResponse.reasons,
      });
      return;
    }
    
    // Use processed arguments from precheck response
    const processedArgs = precheckResponse.content?.args || args;
    
    // Call the MCP function directly
    console.log('Calling MCP function directly:', toolCall.function.name);
    
    // Import the MCP tools directly
    const { mockTools } = await import('../mcp/route');
    
    // Execute the tool directly
    const toolFunction = mockTools[toolCall.function.name as keyof typeof mockTools];
    
    if (!toolFunction) {
      throw new Error(`Unknown tool: ${toolCall.function.name}`);
    }
    
    const mcpResult = {
      success: true,
      data: await toolFunction(processedArgs),
      decision: precheckResponse.decision,
      reasons: precheckResponse.reasons,
    };
    
    console.log('MCP function result:', mcpResult);
    
    // Send tool result
    writer.writeToolResult({
      tool_call_id: toolCall.id,
      success: mcpResult.success,
      data: mcpResult.data,
      error: (mcpResult.data as any)?.error,
      decision: mcpResult.decision,
      reasons: mcpResult.reasons,
    });
    
  } catch (error) {
    writer.writeToolResult({
      tool_call_id: toolCall.id,
      success: false,
      error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model, provider: requestProvider } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Determine provider
    const provider: Provider = requestProvider || (process.env.PROVIDER as Provider) || 'openai';
    const corrId = uuidv4();

    // Create SSE response
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
      },
    });

    const writer = new SSEWriter(controller!);

    // Handle the streaming in the background
    (async () => {
      try {
        // Step 1: Precheck with user context
        const precheckRequest = createChatPrecheckRequest(messages, provider, corrId);
        const { userId, apiKey } = getPrecheckUserIdDetails();

        const precheckResponse = await precheck(precheckRequest, userId, apiKey);

        // Send decision event
        writer.writeDecision(precheckResponse.decision, precheckResponse.reasons);

        // Step 2: Handle precheck decision
        if (precheckResponse.decision === 'block') {
          writer.writeError(
            `Request blocked: ${precheckResponse.reasons?.join(', ') || 'Policy violation'}`
          );
          writer.close();
          return;
        }

        // Use possibly redacted messages from precheck response
        const processedMessages = precheckResponse.content?.messages || messages;

        // Step 3: Get provider and stream response
        let chatProvider;
        try {
          if (provider === 'openai') {
            chatProvider = new OpenAIProvider();
          } else if (provider === 'ollama') {
            chatProvider = new OllamaProvider();
          } else {
            throw new Error(`Unsupported provider: ${provider}`);
          }
        } catch (error) {
          writer.writeError(
            `Provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          writer.close();
          return;
        }

        // Step 4: Stream tokens with tool calling support
        const modelToUse = model || chatProvider.getDefaultModel();
        
        try {
          // Enable tools for both OpenAI and Ollama providers
          const tools = AVAILABLE_TOOLS;
          
          // Add system message with tool information for both providers
          if (tools) {
            const systemMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: `You are a helpful AI assistant with access to various tools. You can use these tools to help users with tasks like checking weather, processing payments, reading files, searching the web, and more. When a user asks for something that requires external data or actions, use the appropriate tool. Always explain what you're doing when you use a tool.`,
            };
            processedMessages.unshift(systemMessage);
          }
          
          for await (const chunk of chatProvider.stream(processedMessages, modelToUse, tools)) {
            if (chunk.type === 'content') {
              writer.writeContent(chunk.data);
            } else if (chunk.type === 'tool_call') {
              // Handle tool call
              const toolCall = chunk.data as ToolCall;
              console.log('Tool call received:', toolCall);
              writer.writeToolCall(toolCall);
              
              // Execute the tool call
              await executeToolCall(toolCall, writer, userId, apiKey);
            }
          }
          
          writer.writeDone();
        } catch (error) {
          writer.writeError(
            `Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        } finally {
          writer.close();
        }

      } catch (error) {
        writer.writeError(
          `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        writer.close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
