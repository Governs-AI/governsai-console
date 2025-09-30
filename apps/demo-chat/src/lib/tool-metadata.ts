import { ToolConfigMetadata } from './types';

// Tool metadata configuration for governance and policy enforcement
export const TOOL_METADATA: Record<string, ToolConfigMetadata> = {
  'weather.current': {
    tool_name: 'weather.current',
    scope: 'net.external',
    direction: 'both',
    metadata: {
      category: 'data',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'weather.forecast': {
    tool_name: 'weather.forecast',
    scope: 'net.external',
    direction: 'both',
    metadata: {
      category: 'data',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'payment.process': {
    tool_name: 'payment.process',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'financial',
      risk_level: 'critical',
      requires_approval: true,
    },
  },
  'payment.refund': {
    tool_name: 'payment.refund',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'financial',
      risk_level: 'critical',
      requires_approval: true,
    },
  },
  'db.query': {
    tool_name: 'db.query',
    scope: 'local',
    direction: 'both',
    metadata: {
      category: 'data',
      risk_level: 'high',
      requires_approval: false,
    },
  },
  'file.read': {
    tool_name: 'file.read',
    scope: 'local',
    direction: 'ingress',
    metadata: {
      category: 'file',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'file.write': {
    tool_name: 'file.write',
    scope: 'local',
    direction: 'egress',
    metadata: {
      category: 'file',
      risk_level: 'high',
      requires_approval: false,
    },
  },
  'file.list': {
    tool_name: 'file.list',
    scope: 'local',
    direction: 'ingress',
    metadata: {
      category: 'file',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'web.search': {
    tool_name: 'web.search',
    scope: 'net.external',
    direction: 'ingress',
    metadata: {
      category: 'web',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'web.scrape': {
    tool_name: 'web.scrape',
    scope: 'net.external',
    direction: 'ingress',
    metadata: {
      category: 'web',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'email.send': {
    tool_name: 'email.send',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'communication',
      risk_level: 'high',
      requires_approval: true,
    },
  },
  'calendar.create_event': {
    tool_name: 'calendar.create_event',
    scope: 'net.external',
    direction: 'egress',
    metadata: {
      category: 'communication',
      risk_level: 'medium',
      requires_approval: false,
    },
  },
  'kv.get': {
    tool_name: 'kv.get',
    scope: 'local',
    direction: 'ingress',
    metadata: {
      category: 'data',
      risk_level: 'low',
      requires_approval: false,
    },
  },
  'kv.set': {
    tool_name: 'kv.set',
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
