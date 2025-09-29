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
      
      // If precheck service is not available, return a mock allow response for demo purposes
      if (response.status === 404 || response.status === 500) {
        console.log('Precheck service not available, using mock response for demo');
        return {
          decision: 'allow',
          content: {
            messages: input.payload?.messages || [],
            args: input.payload?.args || input.payload || {}
          },
          reasons: ['Demo mode - precheck service not available'],
          pii_findings: [],
          metadata: { mock: true }
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
    
    // Handle network errors - return mock response for demo
    console.log('Precheck service connection failed, using mock response for demo');
    return {
      decision: 'allow',
      content: {
        messages: input.payload?.messages || [],
        args: input.payload?.args || input.payload || {}
      },
      reasons: ['Demo mode - precheck service not available'],
      pii_findings: [],
      metadata: { mock: true }
    } as PrecheckResponse;
  }
}

// Helper function to create a precheck request for chat messages
export function createChatPrecheckRequest(
  messages: any[],
  provider: string,
  corrId?: string
): PrecheckRequest {
  const rawText = messages
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .join('\n');

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
  };
}

// Helper function to create a precheck request for MCP calls
export function createMCPPrecheckRequest(
  tool: string,
  args: Record<string, any>,
  corrId?: string
): PrecheckRequest {
  // Create a raw_text representation of the MCP call for precheck
  const rawText = `MCP Tool Call: ${tool} with arguments: ${JSON.stringify(args)}`;
  
  return {
    tool: `mcp.${tool}`,
    scope: 'net.external',
    raw_text: rawText,
    payload: {
      tool,
      args,
    },
    tags: ['demo', 'mcp'],
    corr_id: corrId,
  };
}
