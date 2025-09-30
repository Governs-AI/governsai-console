import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Agent Tool Registration Endpoint
 * Allows external agents to register their tools using API key authentication
 * POST /api/agents/tools/register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, orgId, tools } = body;

    // Validate required fields
    if (!apiKey || !orgId || !tools || !Array.isArray(tools)) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, orgId, and tools array' },
        { status: 400 }
      );
    }

    // Authenticate API key (simplified - in production, validate against APIKey table)
    // TODO: Add proper API key validation
    if (!apiKey.startsWith('gai_') && !apiKey.startsWith('demo-')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      );
    }

    const results = {
      created: [] as string[],
      updated: [] as string[],
      skipped: [] as string[],
      errors: [] as { tool: string; error: string }[],
    };

    // Process each tool
    for (const tool of tools) {
      try {
        // Validate tool data
        if (!tool.toolName) {
          results.errors.push({
            tool: tool.toolName || 'unknown',
            error: 'Missing toolName',
          });
          continue;
        }

        // Check if tool already exists
        const existingTool = await prisma.toolConfig.findUnique({
          where: { toolName: tool.toolName },
        });

        if (existingTool) {
          // Update existing tool if data has changed
          await prisma.toolConfig.update({
            where: { toolName: tool.toolName },
            data: {
              displayName: tool.displayName || existingTool.displayName,
              description: tool.description || existingTool.description,
              category: tool.category || existingTool.category,
              riskLevel: tool.riskLevel || existingTool.riskLevel,
              scope: tool.scope || existingTool.scope,
              direction: tool.direction || existingTool.direction,
              metadata: tool.metadata || existingTool.metadata,
              requiresApproval: tool.requiresApproval ?? existingTool.requiresApproval,
              isActive: tool.isActive ?? existingTool.isActive,
              updatedAt: new Date(),
            },
          });
          results.updated.push(tool.toolName);
        } else {
          // Create new tool
          await prisma.toolConfig.create({
            data: {
              toolName: tool.toolName,
              displayName: tool.displayName || tool.toolName,
              description: tool.description || '',
              category: tool.category || 'other',
              riskLevel: tool.riskLevel || 'medium',
              scope: tool.scope || 'net.external',
              direction: tool.direction || 'both',
              metadata: tool.metadata || {},
              requiresApproval: tool.requiresApproval ?? false,
              isActive: tool.isActive ?? true,
            },
          });
          results.created.push(tool.toolName);
        }
      } catch (error) {
        console.error(`Error processing tool ${tool.toolName}:`, error);
        results.errors.push({
          tool: tool.toolName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${tools.length} tools`,
      results,
    });
  } catch (error) {
    console.error('Error in agent tool registration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to register tools',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

