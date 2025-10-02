import { ToolConfigMetadata } from './types';

// Tool metadata configuration for governance and policy enforcement
export const TOOL_METADATA: Record<string, ToolConfigMetadata> = {
  'weather_current': {
    tool_name: 'weather_current',
    scope: 'net.external',
    direction: 'both',
    metadata: {
      category: 'data',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'weather_forecast': {
    tool_name: 'weather_forecast',
    scope: 'net.external',
    direction: 'both',
    metadata: {
      category: 'data',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'payment_process': {
    tool_name: 'payment_process',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'financial',
      risk_level: 'critical',
      requires_approval: true,
      // Purchase amount will be extracted from args.amount
    },
  },
  'payment_refund': {
    tool_name: 'payment_refund',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'financial',
      risk_level: 'critical',
      requires_approval: true,
    },
  },
  'db_query': {
    tool_name: 'db_query',
    scope: 'local',
    direction: 'both',
    metadata: {
      category: 'data',
      risk_level: 'high',
      requires_approval: false,
    },
  },
  'file_read': {
    tool_name: 'file_read',
    scope: 'local',
    direction: 'ingress',
    metadata: {
      category: 'file',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'file_write': {
    tool_name: 'file_write',
    scope: 'local',
    direction: 'egress',
    metadata: {
      category: 'file',
      risk_level: 'high',
      requires_approval: false,
    },
  },
  'file_list': {
    tool_name: 'file_list',
    scope: 'local',
    direction: 'ingress',
    metadata: {
      category: 'file',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'web_search': {
    tool_name: 'web_search',
    scope: 'net.external',
    direction: 'ingress',
    metadata: {
      category: 'web',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'web_scrape': {
    tool_name: 'web_scrape',
    scope: 'net.external',
    direction: 'ingress',
    metadata: {
      category: 'web',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'email_send': {
    tool_name: 'email_send',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'communication',
      risk_level: 'high',
      requires_approval: true,
    },
  },
  'calendar_create_event': {
    tool_name: 'calendar_create_event',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'communication',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'kv_get': {
    tool_name: 'kv_get',
    scope: 'local',
    direction: 'ingress',
    metadata: {
      category: 'data',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'kv_set': {
    tool_name: 'kv_set',
    scope: 'local',
    direction: 'egress',
    metadata: {
      category: 'data',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'model.chat': {
    tool_name: 'model.chat',
    scope: 'net.external',
    direction: 'both',
    metadata: {
      category: 'ai',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
};

// Helper function to get tool metadata by name
export function getToolMetadata(toolName: string): ToolConfigMetadata | undefined {
  return TOOL_METADATA[toolName];
}

// Helper function to get all tool metadata
export function getAllToolMetadata(): ToolConfigMetadata[] {
  return Object.values(TOOL_METADATA);
}

// Helper function to filter tools by category
export function getToolsByCategory(category: string): ToolConfigMetadata[] {
  return Object.values(TOOL_METADATA).filter(
    (tool) => tool.metadata.category === category
  );
}

// Helper function to filter tools by risk level
export function getToolsByRiskLevel(riskLevel: string): ToolConfigMetadata[] {
  return Object.values(TOOL_METADATA).filter(
    (tool) => tool.metadata.risk_level === riskLevel
  );
}
