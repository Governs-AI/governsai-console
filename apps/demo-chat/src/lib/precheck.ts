import { PrecheckRequest, PrecheckResponse } from './types';
import { getPrecheckUserIdDetails } from './utils';

export class PrecheckError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'PrecheckError';
  }
}

// Helper function to fetch budget context
export async function fetchBudgetContext(apiKey?: string): Promise<any> {
  const { apiKey: defaultApiKey } = getPrecheckUserIdDetails();
  const finalApiKey = apiKey || defaultApiKey;
  
  const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
  
  try {
    const response = await fetch(`${platformUrl}/api/budget/context`, {
      method: 'GET',
      headers: {
        'X-Governs-Key': finalApiKey,
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch budget context, using mock data for testing');
      // Return mock budget context for testing
      return {
        monthly_limit: 1000.00,
        current_spend: 0.00,
        llm_spend: 0.00,
        purchase_spend: 0.00,
        remaining_budget: 1000.00,
        budget_type: 'user'
      };
    }

    return await response.json();
  } catch (error) {
    console.warn('Error fetching budget context, using mock data for testing:', error);
    // Return mock budget context for testing
    return {
      monthly_limit: 1000.00,
      current_spend: 0.00,
      llm_spend: 0.00,
      purchase_spend: 0.00,
      remaining_budget: 1000.00,
      budget_type: 'user'
    };
  }
}

export async function precheck(
  input: PrecheckRequest, 
  userId?: string, 
  apiKey?: string
): Promise<PrecheckResponse> {
  const { userId: defaultUserId, apiKey: defaultApiKey } = getPrecheckUserIdDetails();

  const baseUrl = process.env.PRECHECK_URL || 'http://172.16.10.121:8080';
  
  // Use provided userId/apiKey or fall back to defaults
  const finalUserId = userId || defaultUserId;
  const finalApiKey = apiKey || defaultApiKey;
  
  // Construct the user-specific precheck URL
  // const url = `${baseUrl}/v1/u/${finalUserId}/precheck`;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Governs-Key': finalApiKey,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // If precheck service is not available, BLOCK the request for security
      if (response.status === 404 || response.status === 500) {
        console.error('⛔ Precheck service not available - BLOCKING request for security');
        return {
          decision: 'block',
          content: {
            messages: input.payload?.messages || [],
            args: input.payload?.args || input.payload || {}
          },
          reasons: ['Precheck service unavailable - request blocked for security'],
          pii_findings: [],
          metadata: { 
            mock: true,
            error: 'Precheck service not reachable',
            status: response.status
          }
        } as PrecheckResponse;
      }
      
      throw new PrecheckError(
        `Precheck request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const result = await response.json();
    return result as PrecheckResponse;
  } catch (error) {
    if (error instanceof PrecheckError) {
      throw error;
    }
    
    // Handle network errors - BLOCK for security
    console.error('⛔ Precheck service connection failed - BLOCKING request for security');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      decision: 'block',
      content: {
        messages: input.payload?.messages || [],
        args: input.payload?.args || input.payload || {}
      },
      reasons: ['Precheck service connection failed - request blocked for security'],
      pii_findings: [],
      metadata: { 
        mock: true,
        error: error instanceof Error ? error.message : 'Network error',
        errorType: 'connection_failed'
      }
    } as PrecheckResponse;
  }
}

// Helper function to create a precheck request for chat messages
export function createChatPrecheckRequest(
  messages: any[],
  provider: string,
  corrId?: string,
  policyConfig?: any,
  toolConfig?: any
): PrecheckRequest {
  // Only send the last user message for precheck, not the entire conversation history
  // This prevents old blocked messages from affecting new requests
  const lastUserMessage = messages
    .filter(msg => msg.role === 'user')
    .slice(-1)[0]; // Get only the last user message
  
  const rawText = lastUserMessage?.content || '';

  return {
    tool: 'model.chat',
    scope: 'net.external',
    raw_text: rawText,
    payload: {
      messages,
      provider,
    },
    tags: ['demo', 'chat'],
    corr_id: corrId,
    policy_config: policyConfig,
    tool_config: toolConfig,
  };
}

// Helper function to create a precheck request for MCP calls
export function createMCPPrecheckRequest(
  tool: string,
  args: Record<string, any>,
  corrId?: string,
  policyConfig?: any,
  toolConfig?: any,
  budgetContext?: any
): PrecheckRequest {
  // Create a raw_text representation of the MCP call for precheck
  const rawText = `MCP Tool Call: ${tool} with arguments: ${JSON.stringify(args)}`;
  
  // Extract purchase amount from args for payment tools
  let enhancedToolConfig = { ...toolConfig };
  if (tool === 'payment_process' && args.amount) {
    enhancedToolConfig = {
      ...toolConfig,
      metadata: {
        ...toolConfig?.metadata,
        purchase_amount: Number(args.amount), // ← Extract purchase amount
        amount: Number(args.amount),
        currency: args.currency || 'USD',
        description: args.description || 'Payment transaction',
      }
    };
  }
  
  return {
    tool: tool, // Use the actual tool name, not "mcp.${tool}"
    scope: enhancedToolConfig?.scope || 'net.external',
    raw_text: rawText,
    payload: {
      tool,
      args,
    },
    tags: ['demo', 'mcp'],
    corr_id: corrId,
    policy_config: policyConfig,
    tool_config: enhancedToolConfig,
    budget_context: budgetContext, // ← Add budget context
  };
}
