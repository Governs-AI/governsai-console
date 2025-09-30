/**
 * Tool Registration Helper for Agents
 * Allows agents to register their tools with the GovernsAI platform
 */

const PLATFORM_BASE_URL = process.env.PLATFORM_URL || 'http://localhost:3002';

export interface ToolRegistration {
  toolName: string;
  displayName?: string;
  description?: string;
  category?: 'communication' | 'data' | 'computation' | 'file' | 'web' | 'payment' | 'calendar' | 'storage' | 'other';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  scope?: 'net.external' | 'net.internal' | 'local' | 'net.';
  direction?: 'ingress' | 'egress' | 'both';
  metadata?: Record<string, any>;
  requiresApproval?: boolean;
  isActive?: boolean;
}

export interface ToolRegistrationResult {
  success: boolean;
  message: string;
  results: {
    created: string[];
    updated: string[];
    skipped: string[];
    errors: { tool: string; error: string }[];
  };
}

/**
 * Register tools with the GovernsAI platform
 * This should be called when your agent starts up
 */
export async function registerToolsWithPlatform(
  tools: ToolRegistration[]
): Promise<ToolRegistrationResult> {
  try {
    const response = await fetch(`${PLATFORM_BASE_URL}/api/agents/tools/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: DEMO_API_KEY,
        orgId: DEMO_ORG_ID,
        tools,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to register tools');
    }

    return await response.json();
  } catch (error) {
    console.error('Error registering tools with platform:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      results: {
        created: [],
        updated: [],
        skipped: [],
        errors: tools.map(tool => ({
          tool: tool.toolName,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
      },
    };
  }
}

/**
 * Create tool registration from OpenAI function definition
 */
export function createToolRegistrationFromFunction(
  func: any,
  overrides?: Partial<ToolRegistration>
): ToolRegistration {
  const toolName = func.function?.name || func.name;
  
  return {
    toolName,
    displayName: overrides?.displayName || toolName,
    description: overrides?.description || func.function?.description || func.description || '',
    category: overrides?.category || inferCategory(toolName),
    riskLevel: overrides?.riskLevel || inferRiskLevel(toolName),
    scope: overrides?.scope || inferScope(toolName),
    direction: overrides?.direction || 'both',
    metadata: overrides?.metadata || {
      parameters: func.function?.parameters || func.parameters,
    },
    requiresApproval: overrides?.requiresApproval ?? false,
    isActive: overrides?.isActive ?? true,
  };
}

/**
 * Helper function to infer category from tool name
 */
function inferCategory(toolName: string): ToolRegistration['category'] {
  const name = toolName.toLowerCase();
  
  if (name.includes('email') || name.includes('message')) return 'communication';
  if (name.includes('payment') || name.includes('transaction')) return 'payment';
  if (name.includes('file') || name.includes('document')) return 'file';
  if (name.includes('web') || name.includes('search') || name.includes('scrape')) return 'web';
  if (name.includes('calendar') || name.includes('schedule')) return 'calendar';
  if (name.includes('database') || name.includes('query')) return 'data';
  if (name.includes('compute') || name.includes('exec') || name.includes('run')) return 'computation';
  if (name.includes('kv') || name.includes('storage') || name.includes('cache')) return 'storage';
  
  return 'other';
}

/**
 * Helper function to infer risk level from tool name
 */
function inferRiskLevel(toolName: string): ToolRegistration['riskLevel'] {
  const name = toolName.toLowerCase();
  
  // Critical risk
  if (name.includes('exec') || name.includes('shell') || name.includes('bash') || name.includes('python')) {
    return 'critical';
  }
  
  // High risk
  if (name.includes('payment') || name.includes('transaction') || name.includes('delete') || name.includes('drop')) {
    return 'high';
  }
  
  // Medium risk
  if (name.includes('write') || name.includes('update') || name.includes('create') || name.includes('send')) {
    return 'medium';
  }
  
  // Low risk
  return 'low';
}

/**
 * Helper function to infer scope from tool name
 */
function inferScope(toolName: string): ToolRegistration['scope'] {
  const name = toolName.toLowerCase();
  
  if (name.includes('web') || name.includes('api') || name.includes('http')) {
    return 'net.external';
  }
  
  if (name.includes('local') || name.includes('file')) {
    return 'local';
  }
  
  return 'net.external';
}

/**
 * Example usage:
 * 
 * // At agent startup:
 * const tools = AVAILABLE_TOOLS.map(tool => createToolRegistrationFromFunction(tool));
 * const result = await registerToolsWithPlatform(tools);
 * console.log('Tool registration result:', result);
 */

