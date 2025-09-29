import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { precheck, createMCPPrecheckRequest } from '@/lib/precheck';
import { MCPRequest, MCPResponse } from '@/lib/types';

// Mock MCP tool implementations
const mockTools = {
  'web.search': async (args: Record<string, any>) => {
    const query = args.query || 'default query';
    return {
      results: [
        {
          title: `Search result for: ${query}`,
          url: 'https://example.com/result1',
          snippet: 'This is a mock search result demonstrating the MCP integration.',
        },
        {
          title: `Another result for: ${query}`,
          url: 'https://example.com/result2', 
          snippet: 'Mock data showing how precheck gates MCP tool calls.',
        },
      ],
      total: 2,
    };
  },

  'kv.get': async (args: Record<string, any>) => {
    const key = args.key || 'default_key';
    return {
      key,
      value: `Mock value for key: ${key}`,
      timestamp: new Date().toISOString(),
    };
  },

  'kv.set': async (args: Record<string, any>) => {
    const { key, value } = args;
    return {
      success: true,
      key,
      value,
      timestamp: new Date().toISOString(),
    };
  },

  'file.read': async (args: Record<string, any>) => {
    const path = args.path || '/mock/file.txt';
    return {
      path,
      content: `Mock file content for: ${path}`,
      size: 1024,
      modified: new Date().toISOString(),
    };
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: MCPRequest = await request.json();
    const { tool, args } = body;

    if (!tool) {
      return Response.json(
        { success: false, error: 'Tool name is required' } as MCPResponse,
        { status: 400 }
      );
    }

    const corrId = uuidv4();

    // Step 1: Precheck the MCP call
    const precheckRequest = createMCPPrecheckRequest(tool, args || {}, corrId);
    
    try {
      const precheckResponse = await precheck(precheckRequest);

      // Step 2: Handle precheck decision
      if (precheckResponse.decision === 'block') {
        return Response.json({
          success: false,
          error: 'MCP call blocked by policy',
          decision: precheckResponse.decision,
          reasons: precheckResponse.reasons,
        } as MCPResponse, { status: 403 });
      }

      // For confirm decision, we mock-approve (no actual UI confirmation in demo)
      if (precheckResponse.decision === 'confirm') {
        console.log(`Mock-confirming MCP call: ${tool} with args:`, args);
      }

      // Use possibly modified args from precheck response
      const processedArgs = precheckResponse.content?.args || args || {};

      // Step 3: Execute the MCP tool (mock implementation)
      const toolFunction = mockTools[tool as keyof typeof mockTools];
      
      if (!toolFunction) {
        return Response.json({
          success: false,
          error: `Unknown tool: ${tool}`,
          decision: precheckResponse.decision,
          reasons: precheckResponse.reasons,
        } as MCPResponse, { status: 400 });
      }

      const result = await toolFunction(processedArgs);

      return Response.json({
        success: true,
        data: result,
        decision: precheckResponse.decision,
        reasons: precheckResponse.reasons,
      } as MCPResponse);

    } catch (precheckError) {
      console.error('Precheck failed for MCP call:', precheckError);
      
      return Response.json({
        success: false,
        error: 'Precheck service unavailable',
        details: precheckError instanceof Error ? precheckError.message : 'Unknown error',
      } as MCPResponse, { status: 503 });
    }

  } catch (error) {
    console.error('MCP API error:', error);
    return Response.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as MCPResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return available tools
  return Response.json({
    tools: Object.keys(mockTools).map(tool => ({
      name: tool,
      description: `Mock implementation of ${tool}`,
    })),
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
