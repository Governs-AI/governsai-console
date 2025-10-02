import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { precheck, createChatPrecheckRequest, createMCPPrecheckRequest } from '@/lib/precheck';
import { OpenAIProvider } from '@/lib/providers/openai';
import { OllamaProvider } from '@/lib/providers/ollama';
import { SSEWriter } from '@/lib/sse';
import { ChatRequest, Provider, Message, ToolCall } from '@/lib/types';
import { getPrecheckUserIdDetails } from '@/lib/utils';
import { AVAILABLE_TOOLS } from '@/lib/tools';
import { getToolMetadata } from '@/lib/tool-metadata';
import { fetchPoliciesFromPlatform, registerAgentTools, registerToolsWithMetadata, getToolMetadataFromPlatform } from '@/lib/platform-api';
import { calculateCost, getProvider, getCostType } from '@governs-ai/common-utils';

// Helper function to record usage after AI call
async function recordUsage(
  userId: string,
  orgId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  tool?: string,
  correlationId?: string,
  metadata?: Record<string, any>
) {
  try {
    const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
    
    await fetch(`${platformUrl}/api/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        orgId,
        model,
        inputTokens,
        outputTokens,
        tool,
        correlationId,
        metadata,
      }),
    });
  } catch (error) {
    console.error('Failed to record usage:', error);
    // Don't throw - usage recording failure shouldn't break the chat
  }
}

// Helper function to execute tool calls
async function executeToolCall(toolCall: ToolCall, writer: SSEWriter, userId?: string, apiKey?: string, platformToolMetadata?: Record<string, any>, skipPrecheck: boolean = false) {
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

    // If no policy found, block the tool call
    if (!platformData.policy) {
      writer.writeToolResult({
        tool_call_id: toolCall.id,
        success: false,
        error: 'No governance policy configured. Tool calls blocked.',
        decision: 'block',
        reasons: ['No policy found in platform'],
      });
      return;
    }

    const policy = platformData.policy;
    
    // Create MCP precheck request for the tool call with policy and tool config
    let precheckResponse;
    
    if (skipPrecheck) {
      console.log(`✅ SKIPPING PRECHECK FOR APPROVED REQUEST: ${toolCall.function.name}`);
      precheckResponse = {
        decision: 'allow' as const,
        reasons: ['Request previously approved'],
        content: { args }
      };
    } else {
      const precheckRequest = createMCPPrecheckRequest(
        toolCall.function.name, 
        args, 
        uuidv4(), 
        policy, 
        toolMetadata
      );

      precheckResponse = await precheck(precheckRequest, userId, apiKey);
    }


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

    // Handle confirmation requirement
    if (precheckResponse.decision === 'confirm') {
      console.log(`⏸️  TOOL CALL REQUIRES CONFIRMATION: ${toolCall.function.name}`);

      // Create pending confirmation via platform API
      const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
      const confirmationResponse = await fetch(`${platformUrl}/api/v1/confirmation/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Governs-Key': apiKey || '',
        },
        body: JSON.stringify({
          correlationId: uuidv4(),
          requestType: 'tool_call',
          requestDesc: `Execute tool: ${toolCall.function.name}`,
          requestPayload: {
            tool: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
          },
          decision: precheckResponse.decision,
          reasons: precheckResponse.reasons,
        }),
      });

      if (!confirmationResponse.ok) {
        writer.writeToolResult({
          tool_call_id: toolCall.id,
          success: false,
          error: 'Failed to create confirmation request',
          decision: precheckResponse.decision,
          reasons: precheckResponse.reasons,
        });
        return;
      }

      const confirmationData = await confirmationResponse.json();

      writer.writeToolResult({
        tool_call_id: toolCall.id,
        success: false,
        error: 'Confirmation required',
        decision: precheckResponse.decision,
        reasons: precheckResponse.reasons,
        confirmationRequired: true,
        correlationId: confirmationData.confirmation.correlationId,
        confirmationUrl: `${platformUrl}/confirm/${confirmationData.confirmation.correlationId}`,
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
        const platformToolMetadata = platformData.toolMetadata || {};

        // If no policy found, block the request for security
        if (!platformData.policy) {
          writer.writeError(
            'No governance policy configured. Please configure a policy in the platform or run the database seed script.'
          );
          writer.close();
          return;
        }

        const policy = platformData.policy;
        // Use the seeded organization ID from the database
        const orgId = platformData.orgId || 'cmg83v4ki00005q6app5ouwrw'; // Get orgId from platform data or use seeded org
        
        console.log('Platform data orgId:', platformData.orgId);
        console.log('Using orgId for usage recording:', orgId);
        
        // Register this agent's tools with the platform (with full metadata for auto-discovery)
        await registerToolsWithMetadata(AVAILABLE_TOOLS);
        
        // Also register tool names for tracking
        const toolNames = AVAILABLE_TOOLS.map(tool => tool.function.name);
        await registerAgentTools(toolNames);
        
        // Step 2: Precheck with user context, policy, and tool metadata
        const chatToolMetadata = getToolMetadataFromPlatform('model.chat', platformToolMetadata) || getToolMetadata('model.chat');
        // Get user context for all flows
        const { userId, apiKey } = getPrecheckUserIdDetails();
        
        // Check if this is a confirmation approved continuation
        const lastMessage = messages[messages.length - 1];
        const confirmationApprovedMatch = lastMessage?.content?.match(/\[CONFIRMATION_APPROVED:([^\]]+)\]/);
        
        let precheckResponse;
        if (confirmationApprovedMatch) {
          // This is a continuation after confirmation approval, bypass precheck
          const approvedCorrelationId = confirmationApprovedMatch[1];
          console.log(`✅ CONFIRMATION APPROVED CONTINUATION: ${approvedCorrelationId}`);
          
          // Clean up the messages by removing the confirmation token
          const cleanedMessages = messages.map(msg => ({
            ...msg,
            content: msg.content.replace(/\[CONFIRMATION_APPROVED:[^\]]+\]\s*/, '') // Remove the token
          }));
          
          precheckResponse = {
            decision: 'allow' as const,
            reasons: ['Confirmation previously approved'],
            content: {
              messages: cleanedMessages
            }
          };
        } else {
          // Normal precheck flow
          const precheckRequest = createChatPrecheckRequest(
            messages, 
            provider, 
            corrId, 
            policy, 
            chatToolMetadata
          );

          precheckResponse = await precheck(precheckRequest, userId, apiKey);
        }
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

        // Handle confirmation requirement for chat
        if (precheckResponse.decision === 'confirm') {
          console.log('⏸️  CHAT REQUEST REQUIRES CONFIRMATION');

          // Create pending confirmation via platform API
          const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
          const confirmationResponse = await fetch(`${platformUrl}/api/v1/confirmation/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Governs-Key': apiKey || '',
            },
            body: JSON.stringify({
              correlationId: corrId,
              requestType: 'chat',
              requestDesc: `Chat request with ${messages.length} message(s)`,
              requestPayload: {
                messages: messages.slice(-3), // Only send last 3 messages for context
                provider,
              },
              decision: precheckResponse.decision,
              reasons: precheckResponse.reasons,
            }),
          });

          if (!confirmationResponse.ok) {
            writer.writeError('Failed to create confirmation request');
            writer.close();
            return;
          }

          const confirmationData = await confirmationResponse.json();

          writer.writeError(
            `Confirmation required: ${precheckResponse.reasons?.join(', ') || 'User confirmation needed'}\n\n` +
            `Please visit: ${platformUrl}/confirm/${confirmationData.confirmation.correlationId}`
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
        
        // Track usage data for recording
        let usageData: {
          inputTokens: number;
          outputTokens: number;
          model: string;
          provider: string;
        } | null = null;
        
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
- For weather requests: Use weather_current or weather_forecast with coordinates
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
              // Skip precheck if this is a confirmation approved continuation
              const skipPrecheck = confirmationApprovedMatch !== null;
              await executeToolCall(toolCall, writer, userId, apiKey, platformToolMetadata, skipPrecheck);
            } else if (chunk.type === 'usage') {
              // Capture usage data for recording
              usageData = {
                inputTokens: chunk.data.prompt_tokens || 0,
                outputTokens: chunk.data.completion_tokens || 0,
                model: modelToUse,
                provider: provider,
              };
            }
          }
          
          writer.writeDone();
          
          // Record usage after successful completion
          if (usageData && userId && orgId) {
            console.log('📊 Recording usage:', {
              userId,
              orgId,
              model: usageData.model,
              inputTokens: usageData.inputTokens,
              outputTokens: usageData.outputTokens,
              provider: usageData.provider,
              correlationId: corrId
            });
            
            try {
              await recordUsage(
                userId,
                orgId,
                usageData.model,
                usageData.inputTokens,
                usageData.outputTokens,
                'chat',
                corrId,
                {
                  messageCount: processedMessages.length,
                  provider: usageData.provider,
                }
              );
              console.log('✅ Usage recorded successfully');
            } catch (error) {
              console.error('❌ Failed to record usage:', error);
              // Don't throw - usage recording failure shouldn't break the chat
            }
          } else {
            console.warn('⚠️ Usage recording skipped:', {
              hasUsageData: !!usageData,
              hasUserId: !!userId,
              hasOrgId: !!orgId,
              usageData,
              userId,
              orgId
            });
          }
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
