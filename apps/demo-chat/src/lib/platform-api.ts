import { PolicyConfig, ToolConfigMetadata } from './types';
import { getPrecheckUserIdDetails } from './utils';

// Platform API configuration
const PLATFORM_BASE_URL = process.env.PLATFORM_URL || 'http://localhost:3002';

// Use PRECHECK_API_KEY for platform authentication (same key for both services)
const getApiKey = () => {
  const { apiKey } = getPrecheckUserIdDetails();
  return apiKey;
};

export interface PlatformPolicyResponse {
  policy: PolicyConfig | null;
  toolMetadata: Record<string, ToolConfigMetadata>;
  policyId?: string;
  policyName?: string;
  lastUpdated?: string;
  orgId?: string;
}

export interface AgentToolsResponse {
  agentId: string;
  orgId: string;
  tools: Record<string, ToolConfigMetadata>;
  registeredAt: string;
}

// Fetch policies from the platform
export async function fetchPoliciesFromPlatform(): Promise<PlatformPolicyResponse> {
  try {
    const {userId, apiKey} = getPrecheckUserIdDetails();
    const url = new URL(`${PLATFORM_BASE_URL}/api/agents/policies`);
    url.searchParams.set('userId', userId);
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch policies: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Warn if no policy found - this should be configured in the platform
    if (!data.policy) {
      console.error('❌ No policy found in platform database!');
      console.error('   Please create a policy in the platform UI or run: pnpm db:seed');
      console.error('   Blocking all requests for security.');
    }

    return data;
  } catch (error) {
    console.error('❌ Platform API not available - BLOCKING all requests for security');
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
    }
    console.error('   Please ensure platform is running at:', PLATFORM_BASE_URL);

    // Return null policy if platform is unavailable - precheck will handle blocking
    return {
      policy: null,
      toolMetadata: {},
      orgId: undefined,
    };
  }
}

// Register tools used by this agent (with full metadata)
export async function registerAgentTools(tools: string[]): Promise<AgentToolsResponse | null> {
  try {
    const { userId, apiKey } = getPrecheckUserIdDetails();
    
    const response = await fetch(`${PLATFORM_BASE_URL}/api/agents/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'demo-chat-agent',
        userId: userId,
        apiKey: apiKey,
        tools,
        metadata: {
          version: '1.0.0',
          environment: 'demo',
          lastSeen: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to register agent tools: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering agent tools:', error);
    return null;
  }
}

// Register tools with full metadata (for auto-discovery)
export async function registerToolsWithMetadata(toolDefinitions: any[]): Promise<any> {
  try {
    const apiKey = getApiKey();
    
    // Import tool metadata
    const { getToolMetadata } = await import('./tool-metadata');
    
    const toolsToRegister = toolDefinitions.map(tool => {
      const toolName = tool.function?.name || tool.name;
      const localMetadata = getToolMetadata(toolName);
      
      return {
        toolName,
        displayName: toolName,
        description: tool.function?.description || tool.description || '',
        category: localMetadata?.metadata.category || 'other',
        riskLevel: localMetadata?.metadata.risk_level || 'medium',
        scope: localMetadata?.scope || 'net.external',
        direction: localMetadata?.direction || 'both',
        metadata: {
          parameters: tool.function?.parameters || tool.parameters,
        },
        requiresApproval: localMetadata?.metadata.requires_approval ?? false,
        isActive: true,
      };
    });

    const { userId } = getPrecheckUserIdDetails();
    
    const response = await fetch(`${PLATFORM_BASE_URL}/api/agents/tools/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: apiKey,
        userId: userId,
        tools: toolsToRegister,
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        console.warn('⚠️  Failed to register tools with platform:', errorData);
      } else {
        const errorText = await response.text();
        console.warn('⚠️  Failed to register tools (non-JSON response):', response.status);
      }
      return null;
    }

    const data = await response.json();
    console.log('✅ Tools registered with platform:', data);
    return data;
  } catch (error) {
    console.warn('⚠️  Could not register tools with platform (service not available)');
    if (error instanceof Error) {
      console.warn('Details:', error.message);
    }
    return null;
  }
}

// Get tool metadata for a specific tool
export function getToolMetadataFromPlatform(
  toolName: string,
  platformToolMetadata: Record<string, ToolConfigMetadata>
): ToolConfigMetadata | undefined {
  return platformToolMetadata[toolName];
}
