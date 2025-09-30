import { PolicyConfig, ToolConfigMetadata } from './types';

// Platform API configuration
const PLATFORM_BASE_URL = process.env.PLATFORM_URL || 'http://localhost:3000';
const DEMO_ORG_ID = process.env.DEMO_ORG_ID || 'demo-org-123';
const DEMO_USER_ID = process.env.DEMO_USER_ID || 'demo-user-123';
const DEMO_API_KEY = process.env.DEMO_API_KEY || 'demo-api-key-123';

export interface PlatformPolicyResponse {
  policy: PolicyConfig | null;
  toolMetadata: Record<string, ToolConfigMetadata>;
  policyId?: string;
  policyName?: string;
  lastUpdated?: string;
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
    const url = new URL(`${PLATFORM_BASE_URL}/api/agents/policies`);
    url.searchParams.set('orgId', DEMO_ORG_ID);
    url.searchParams.set('userId', DEMO_USER_ID);
    url.searchParams.set('apiKey', DEMO_API_KEY);

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
    return data;
  } catch (error) {
    console.error('Error fetching policies from platform:', error);
    // Return default policy if platform is unavailable
    return {
      policy: null,
      toolMetadata: {},
      message: 'Platform unavailable, using default policy',
    };
  }
}

// Register tools used by this agent
export async function registerAgentTools(tools: string[]): Promise<AgentToolsResponse | null> {
  try {
    const response = await fetch(`${PLATFORM_BASE_URL}/api/agents/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: 'demo-chat-agent',
        orgId: DEMO_ORG_ID,
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

// Get tool metadata for a specific tool
export function getToolMetadataFromPlatform(
  toolName: string,
  platformToolMetadata: Record<string, ToolConfigMetadata>
): ToolConfigMetadata | undefined {
  return platformToolMetadata[toolName];
}
