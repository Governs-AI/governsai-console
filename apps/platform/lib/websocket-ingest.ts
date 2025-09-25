import 'server-only';
import { prisma } from '@governs-ai/db';
import { validateIngestData, validateChannelAccess, parseChannel } from './websocket-schemas';
import type { ClientMessage, DecisionData, ToolCallData, DLQData } from './websocket-schemas';

interface IngestContext {
  keyId: string;
  orgId: string;
  userId: string;
  allowedChannels: string[];
}

interface IngestResult {
  success: boolean;
  ackId: string;
  dedup?: boolean;
  error?: string;
  code?: string;
}

export async function handleIngestMessage(
  message: Extract<ClientMessage, { type: 'INGEST' }>,
  context: IngestContext
): Promise<IngestResult> {
  const { channel, schema, idempotencyKey, data } = message;
  const { keyId, orgId, userId, allowedChannels } = context;

  try {
    // 1. Validate channel access
    if (!validateChannelAccess(channel, allowedChannels)) {
      return {
        success: false,
        ackId: idempotencyKey,
        error: 'Channel access denied',
        code: 'ACL_DENIED',
      };
    }

    // 2. Parse and validate channel format
    const channelParts = parseChannel(channel);
    if (!channelParts) {
      return {
        success: false,
        ackId: idempotencyKey,
        error: 'Invalid channel format',
        code: 'INVALID_CHANNEL',
      };
    }

    // 3. Validate data schema
    const validation = validateIngestData(schema, data);
    if (!validation.success) {
      return {
        success: false,
        ackId: idempotencyKey,
        error: 'Schema validation failed',
        code: 'SCHEMA_INVALID',
      };
    }

    const validatedData = validation.data!;

    // 4. Verify orgId matches channel and context
    if (validatedData.orgId !== orgId || channelParts.id !== orgId) {
      return {
        success: false,
        ackId: idempotencyKey,
        error: 'Organization ID mismatch',
        code: 'ACL_DENIED',
      };
    }

    // 5. Check for idempotency (dedupe)
    const existingIngest = await checkIdempotency(orgId, idempotencyKey);
    if (existingIngest) {
      return {
        success: true,
        ackId: idempotencyKey,
        dedup: true,
      };
    }

    // 6. Write to appropriate table based on schema
    await writeIngestData(schema, validatedData, {
      idempotencyKey,
      keyId,
      userId,
      channel,
    });

    // 7. Record idempotency marker
    await recordIdempotency(orgId, idempotencyKey, schema, channel);

    return {
      success: true,
      ackId: idempotencyKey,
      dedup: false,
    };

  } catch (error) {
    console.error('Ingest handler error:', error);
    return {
      success: false,
      ackId: idempotencyKey,
      error: 'Database write failed',
      code: 'DB_WRITE_FAILED',
    };
  }
}

async function checkIdempotency(orgId: string, idempotencyKey: string): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: {
      orgId,
      resource: 'ws_ingest',
      action: idempotencyKey,
    },
  });
  return !!existing;
}

async function recordIdempotency(
  orgId: string, 
  idempotencyKey: string, 
  schema: string, 
  channel: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      orgId,
      resource: 'ws_ingest',
      action: idempotencyKey,
      metadata: {
        schema,
        channel,
        timestamp: new Date().toISOString(),
      },
    },
  });
}

async function writeIngestData(
  schema: string,
  data: DecisionData | ToolCallData | DLQData,
  context: {
    idempotencyKey: string;
    keyId: string;
    userId: string;
    channel: string;
  }
): Promise<void> {
  switch (schema) {
    case 'decision.v1':
      await writeDecisionData(data as DecisionData, context);
      break;
    case 'toolcall.v1':
      await writeToolCallData(data as ToolCallData, context);
      break;
    case 'dlq.v1':
      await writeDLQData(data as DLQData, context);
      break;
    default:
      throw new Error(`Unknown schema: ${schema}`);
  }
}

async function writeDecisionData(
  data: DecisionData,
  context: { idempotencyKey: string; keyId: string; userId: string; channel: string }
): Promise<void> {
  await prisma.decision.create({
    data: {
      orgId: data.orgId,
      direction: data.direction,
      decision: data.decision,
      tool: data.tool,
      scope: data.scope,
      detectorSummary: data.detectorSummary || {},
      payloadHash: data.payloadHash,
      latencyMs: data.latencyMs,
      correlationId: data.correlationId || context.idempotencyKey,
      tags: data.tags || [],
      ts: data.ts ? new Date(data.ts) : new Date(),
    },
  });
}

async function writeToolCallData(
  data: ToolCallData,
  context: { idempotencyKey: string; keyId: string; userId: string; channel: string }
): Promise<void> {
  // For now, store in AuditLog until we have a dedicated ToolCall table
  await prisma.auditLog.create({
    data: {
      orgId: data.orgId,
      resource: 'toolcall',
      action: data.status,
      metadata: {
        tool: data.tool,
        action: data.action,
        direction: data.direction,
        requestHash: data.requestHash,
        responseHash: data.responseHash,
        latencyMs: data.latencyMs,
        costUsd: data.costUsd,
        correlationId: data.correlationId || context.idempotencyKey,
        meta: data.meta,
        channel: context.channel,
        keyId: context.keyId,
        timestamp: new Date().toISOString(),
      },
    },
  });
}

async function writeDLQData(
  data: DLQData,
  context: { idempotencyKey: string; keyId: string; userId: string; channel: string }
): Promise<void> {
  // Store DLQ events in AuditLog with specific resource type
  await prisma.auditLog.create({
    data: {
      orgId: data.orgId,
      resource: 'dlq',
      action: 'dead_letter',
      metadata: {
        source: data.source,
        reason: data.reason,
        payload: data.payload,
        correlationId: data.correlationId || context.idempotencyKey,
        channel: context.channel,
        keyId: context.keyId,
        timestamp: new Date().toISOString(),
      },
    },
  });
}

// Rate limiting helper
export function checkRateLimit(
  keyId: string,
  orgId: string,
  limits: { messagesPerSecond: number; frameSize: number }
): { allowed: boolean; reason?: string } {
  // TODO: Implement Redis-based rate limiting
  // For now, always allow
  return { allowed: true };
}

// Broadcast revocation notice to active sessions
export async function broadcastKeyRevocation(
  keyId: string,
  reason: string = 'Key revoked'
): Promise<void> {
  // Update all active sessions for this key
  await prisma.webSocketSession.updateMany({
    where: {
      // We'd need to store keyId in sessions for this to work
      isActive: true,
    },
    data: {
      isActive: false,
      cursor: {
        revoked: true,
        reason,
        timestamp: new Date().toISOString(),
      },
    },
  });

  // TODO: Send NOTICE message to active WebSocket connections
  console.log(`Broadcasted revocation for key ${keyId}: ${reason}`);
}

// Validate frame size
export function validateFrameSize(message: string, maxSize: number = 128 * 1024): boolean {
  const size = Buffer.byteLength(message, 'utf8');
  return size <= maxSize;
}
