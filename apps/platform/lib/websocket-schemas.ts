import { z } from 'zod';

// Client → Server Message Types
export const ClientMessageSchema = z.discriminatedUnion('type', [
  // Subscribe to channels
  z.object({
    type: z.literal('SUB'),
    channels: z.array(z.string()).min(1),
  }),
  
  // Unsubscribe from channels
  z.object({
    type: z.literal('UNSUB'),
    channels: z.array(z.string()).min(1),
  }),
  
  // Resume with cursors after reconnect
  z.object({
    type: z.literal('RESUME'),
    cursors: z.record(z.string(), z.string()),
  }),
  
  // Ingest data (Precheck → Dashboard)
  z.object({
    type: z.literal('INGEST'),
    channel: z.string(),
    schema: z.enum(['decision.v1', 'toolcall.v1', 'dlq.v1']),
    idempotencyKey: z.string(),
    data: z.record(z.string(), z.unknown()),
  }),
  
  // Keepalive ping
  z.object({
    type: z.literal('PING'),
    t: z.number().optional(),
  }),
  
  // Acknowledge message
  z.object({
    type: z.literal('ACK'),
    id: z.string(),
    channel: z.string(),
    cursor: z.string(),
  }),
]);

// Server → Client Message Types
export const ServerMessageSchema = z.discriminatedUnion('type', [
  // Connection ready
  z.object({
    type: z.literal('READY'),
    channels: z.array(z.string()),
  }),
  
  // Acknowledge ingest
  z.object({
    type: z.literal('ACK'),
    id: z.string(),
    dedup: z.boolean().optional(),
  }),
  
  // Event notification
  z.object({
    type: z.literal('EVENT'),
    channel: z.string(),
    cursor: z.string(),
    data: z.record(z.string(), z.unknown()),
  }),
  
  // System notice
  z.object({
    type: z.literal('NOTICE'),
    code: z.enum(['REVOKE', 'MAINTENANCE', 'UPGRADE']),
    keyId: z.string().optional(),
    reason: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
  
  // Error response
  z.object({
    type: z.literal('ERROR'),
    code: z.enum(['ACL_DENIED', 'SCHEMA_INVALID', 'DB_WRITE_FAILED', 'RATE_LIMIT', 'INVALID_CHANNEL', 'NETWORK_DENIED']),
    detail: z.string().optional(),
    channel: z.string().optional(),
  }),
  
  // Keepalive pong
  z.object({
    type: z.literal('PONG'),
    t: z.number(),
  }),
]);

// Ingest Data Schemas
export const DecisionSchema = z.object({
  orgId: z.string(),
  direction: z.enum(['precheck', 'postcheck']),
  decision: z.enum(['allow', 'transform', 'deny']),
  tool: z.string().optional(),
  scope: z.string().optional(),
  detectorSummary: z.record(z.string(), z.unknown()).optional(),
  payloadHash: z.string(),
  latencyMs: z.number().optional(),
  correlationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ts: z.string().datetime().optional(),
});

export const ToolCallSchema = z.object({
  orgId: z.string(),
  tool: z.string(),
  action: z.string().optional(),
  direction: z.enum(['precheck', 'postcheck']),
  status: z.enum(['allowed', 'transformed', 'denied', 'error']),
  requestHash: z.string(),
  responseHash: z.string().optional(),
  latencyMs: z.number().optional(),
  costUsd: z.number().optional(),
  correlationId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const DLQSchema = z.object({
  orgId: z.string(),
  source: z.string(),
  reason: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
  correlationId: z.string().optional(),
});

// Schema validation helpers
export function validateIngestData(schema: string, data: unknown) {
  switch (schema) {
    case 'decision.v1':
      return DecisionSchema.safeParse(data);
    case 'toolcall.v1':
      return ToolCallSchema.safeParse(data);
    case 'dlq.v1':
      return DLQSchema.safeParse(data);
    default:
      return { success: false, error: { message: 'Unknown schema' } };
  }
}

// Channel pattern validation
export function validateChannelAccess(channel: string, allowedPatterns: string[]): boolean {
  return allowedPatterns.some(pattern => {
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -1); // Remove the '*'
      return channel.startsWith(prefix);
    }
    return channel === pattern;
  });
}

// Extract channel components
export function parseChannel(channel: string): { type: string; id: string; name: string } | null {
  const parts = channel.split(':');
  if (parts.length !== 3) return null;
  
  const [type, id, name] = parts;
  if (!type || !id || !name) return null;
  
  return { type, id, name };
}

// Generate allowed channels for a key
export function generateAllowedChannels(orgId: string, keyId: string, scopes: string[] = []): string[] {
  const channels: string[] = [];
  
  // Always allow org-level channels
  channels.push(`org:${orgId}:*`);
  
  // Add key-specific channels
  channels.push(`key:${keyId}:usage`);
  channels.push(`key:${keyId}:errors`);
  
  // Add scope-specific channels
  if (scopes.includes('decisions')) {
    channels.push(`org:${orgId}:decisions`);
  }
  
  if (scopes.includes('approvals')) {
    channels.push(`org:${orgId}:approvals`);
  }
  
  if (scopes.includes('dlq')) {
    channels.push(`org:${orgId}:dlq`);
  }
  
  return channels;
}

// Type exports
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type DecisionData = z.infer<typeof DecisionSchema>;
export type ToolCallData = z.infer<typeof ToolCallSchema>;
export type DLQData = z.infer<typeof DLQSchema>;
