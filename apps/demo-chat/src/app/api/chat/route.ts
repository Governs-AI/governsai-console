import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { precheck, createChatPrecheckRequest, createMCPPrecheckRequest } from '@/lib/precheck';
import { OpenAIProvider } from '@/lib/providers/openai';
import { OllamaProvider } from '@/lib/providers/ollama';
import { SSEWriter } from '@/lib/sse';
import { ChatRequest, Provider, Message, ToolCall } from '@/lib/types';
import { getPrecheckUserIdDetails } from '@/lib/utils';
import { AVAILABLE_TOOLS } from '@/lib/tools';
import { DEFAULT_POLICY } from '@/lib/default-policy';
import { getToolMetadata } from '@/lib/tool-metadata';
import { fetchPoliciesFromPlatform, registerAgentTools, registerToolsWithMetadata, getToolMetadataFromPlatform } from '@/lib/platform-api';

// Helper function to execute tool calls
async function executeToolCall(toolCall: ToolCall, writer: SSEWriter, userId?: string, apiKey?: string, platformToolMetadata?: Record<string, any>) {
  try {
    console.log('Executing tool call:', toolCall.function.name, 'with args:', toolCall.function.arguments);
    
    // Parse tool arguments
    const args = JSON.parse(toolCall.function.arguments);
    
    // Get tool metadata from platform or fallback to local
    const toolMetadata = platformToolMetadata ? 
      getToolMetadataFromPlatform(toolCall.function.name, platformToolMetadata) || getToolMetadata(toolCall.function.name) :
      getToolMetadata(toolCall.function.name);
    
    // Fetch current policy from platform
    const platformData = await fetchPoliciesFromPlatform();
    const policy = platformData.policy || DEFAULT_POLICY;
    
    // Create MCP precheck request for the tool call with policy and tool config
    const precheckRequest = createMCPPrecheckRequest(
      toolCall.function.name, 
      args, 
      uuidv4(), 
      policy, 
      toolMetadata
    );

    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log(JSON.stringify(precheckRequest, null, 2))
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');
    console.log('===========================');

    const precheckResponse = await precheck(precheckRequest, userId, apiKey);
    
    console.log('=== TOOL PRECHECK RESULT ===');
    console.log('Tool:', toolCall.function.name);
    console.log('Decision:', precheckResponse.decision);
    console.log('Reasons:', precheckResponse.reasons);
    console.log('===========================');
    
    // Send tool call decision
    writer.writeDecision(precheckResponse.decision, precheckResponse.reasons);
    
    // Handle precheck decision
    if (precheckResponse.decision === 'block') {
      console.log(`❌ TOOL CALL BLOCKED: ${toolCall.function.name}`);
      
      // Clean up the error message to be more user-friendly
      let userFriendlyError = 'Policy violation';
      if (precheckResponse.reasons && precheckResponse.reasons.length > 0) {
        // Filter out technical precheck service messages
        const cleanReasons = precheckResponse.reasons.filter(reason => 
          !reason.includes('Precheck service') && 
          !reason.includes('connection failed') &&
          !reason.includes('service not available')
        );
        
        if (cleanReasons.length > 0) {
          userFriendlyError = cleanReasons.join(', ');
        }
      }
      
      writer.writeToolResult({
        tool_call_id: toolCall.id,
        success: false,
        error: `Tool call blocked: ${userFriendlyError}`,
        decision: precheckResponse.decision,
        reasons: precheckResponse.reasons,
      });
      return;
    }
    
    console.log(`✅ TOOL CALL ALLOWED: ${toolCall.function.name} - Executing...`);
    
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
        // Step 1: Fetch policies and tool metadata from platform
        const platformData = await fetchPoliciesFromPlatform();
        const policy = platformData.policy || DEFAULT_POLICY;
        const platformToolMetadata = platformData.toolMetadata || {};
        
        // Register this agent's tools with the platform (with full metadata for auto-discovery)
        await registerToolsWithMetadata(AVAILABLE_TOOLS);
        
        // Also register tool names for tracking
        const toolNames = AVAILABLE_TOOLS.map(tool => tool.function.name);
        await registerAgentTools(toolNames);
        
        // Step 2: Precheck with user context, policy, and tool metadata
        const chatToolMetadata = getToolMetadataFromPlatform('model.chat', platformToolMetadata) || getToolMetadata('model.chat');
        const precheckRequest = createChatPrecheckRequest(
          messages, 
          provider, 
          corrId, 
          policy, 
          chatToolMetadata
        );
        const { userId, apiKey } = getPrecheckUserIdDetails();

        const precheckResponse = await precheck(precheckRequest, userId, apiKey);

        console.log('=== PRECHECK RESULT ===');
        console.log('Decision:', precheckResponse.decision);
        console.log('Reasons:', precheckResponse.reasons);
        console.log('======================');

        // Send decision event
        writer.writeDecision(precheckResponse.decision, precheckResponse.reasons);

        // Step 2: Handle precheck decision
        if (precheckResponse.decision === 'block') {
          console.log('❌ REQUEST BLOCKED BY PRECHECK');
          writer.writeError(
            `Request blocked: ${precheckResponse.reasons?.join(', ') || 'Policy violation'}`
          );
          writer.close();
          return;
        }

        console.log('✅ REQUEST ALLOWED - Proceeding to LLM');

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
              content: `You are a helpful AI assistant with access to tools.

RULES:
- For simple greetings, jokes, or general questions: Answer directly without tools
- For weather requests: Use weather.current or weather.forecast with coordinates
- For other specific tasks: Use the appropriate tool

Common coordinates:
- New Delhi: 28.6139, 77.2090
- London: 51.5074, -0.1278  
- Tokyo: 35.6762, 139.6503
- Berlin: 52.5200, 13.4050

When using tools, make the tool call directly. Don't explain beforehand.`,
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
              
              // Execute the tool call with platform metadata
              await executeToolCall(toolCall, writer, userId, apiKey, platformToolMetadata);
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
