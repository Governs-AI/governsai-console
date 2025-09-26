import { z } from 'zod';

/**
 * Message Validator for WebSocket communications
 * 
 * Validates incoming WebSocket messages and decision data
 * according to GovernsAI schemas.
 */
export class MessageValidator {
  constructor() {
    this.setupSchemas();
  }

  /**
   * Setup Zod validation schemas
   */
  setupSchemas() {
    // Base message schema
    this.baseMessageSchema = z.object({
      type: z.enum(['PING', 'INGEST', 'SUB', 'UNSUB']),
      timestamp: z.string().datetime().optional()
    });

    // PING message schema
    this.pingSchema = z.object({
      type: z.literal('PING'),
      timestamp: z.string().datetime().optional()
    });

    // INGEST message schema
    this.ingestSchema = z.object({
      type: z.literal('INGEST'),
      channel: z.string().min(1),
      schema: z.enum(['decision.v1', 'toolcall.v1', 'dlq.v1']),
      idempotencyKey: z.string().min(1),
      data: z.object({}).passthrough() // Will be validated separately
    });

    // SUB/UNSUB message schema
    this.subscriptionSchema = z.object({
      type: z.enum(['SUB', 'UNSUB']),
      channels: z.array(z.string().min(1)).min(1).max(10)
    });

    // Decision data schema (decision.v1)
    this.decisionDataSchema = z.object({
      orgId: z.string().min(1),
      direction: z.enum(['precheck', 'postcheck']),
      decision: z.enum(['allow', 'transform', 'deny']),
      tool: z.string().optional(),
      scope: z.string().optional(),
      detectorSummary: z.record(z.string(), z.unknown()).optional(),
      payloadHash: z.string().min(1),
      latencyMs: z.number().int().min(0).optional(),
      correlationId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      ts: z.string().datetime().optional()
    });

    // Channel name schema
    this.channelSchema = z.string().regex(
      /^(org|user|key):[a-zA-Z0-9_-]+:(decisions|notifications|usage|precheck|postcheck|dlq|approvals)$/,
      'Channel must follow format: {type}:{id}:{category} where category is one of: decisions, notifications, usage, precheck, postcheck, dlq, approvals'
    );
  }

  /**
   * Validate incoming WebSocket message
   */
  validateMessage(message) {
    try {
      // First validate base structure
      const baseResult = this.baseMessageSchema.safeParse(message);
      if (!baseResult.success) {
        return {
          success: false,
          error: `Invalid message structure: ${this.formatZodError(baseResult.error)}`
        };
      }

      // Then validate specific message type
      switch (message.type) {
        case 'PING':
          return this.validatePing(message);
        
        case 'INGEST':
          return this.validateIngest(message);
        
        case 'SUB':
        case 'UNSUB':
          return this.validateSubscription(message);
        
        default:
          return {
            success: false,
            error: `Unknown message type: ${message.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate PING message
   */
  validatePing(message) {
    const result = this.pingSchema.safeParse(message);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid PING message: ${this.formatZodError(result.error)}`
      };
    }
    return { success: true };
  }

  /**
   * Validate INGEST message
   */
  validateIngest(message) {
    const result = this.ingestSchema.safeParse(message);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid INGEST message: ${this.formatZodError(result.error)}`
      };
    }

    // Validate channel format
    const channelResult = this.channelSchema.safeParse(message.channel);
    if (!channelResult.success) {
      return {
        success: false,
        error: `Invalid channel format: ${message.channel}`
      };
    }

    return { success: true };
  }

  /**
   * Validate SUB/UNSUB message
   */
  validateSubscription(message) {
    const result = this.subscriptionSchema.safeParse(message);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid ${message.type} message: ${this.formatZodError(result.error)}`
      };
    }

    // Validate all channel formats
    for (const channel of message.channels) {
      const channelResult = this.channelSchema.safeParse(channel);
      if (!channelResult.success) {
        return {
          success: false,
          error: `Invalid channel format: ${channel}`
        };
      }
    }

    return { success: true };
  }

  /**
   * Validate decision data (for INGEST messages)
   */
  validateDecisionData(data) {
    const result = this.decisionDataSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid decision data: ${this.formatZodError(result.error)}`
      };
    }

    // Additional business logic validations
    if (data.latencyMs !== undefined && data.latencyMs < 0) {
      return {
        success: false,
        error: 'latencyMs must be non-negative'
      };
    }

    if (data.payloadHash && !data.payloadHash.startsWith('sha256:')) {
      return {
        success: false,
        error: 'payloadHash should start with "sha256:"'
      };
    }

    return { success: true };
  }

  /**
   * Validate channel name
   */
  validateChannel(channel) {
    const result = this.channelSchema.safeParse(channel);
    return {
      success: result.success,
      error: result.success ? null : `Invalid channel format: ${channel}`
    };
  }

  /**
   * Parse channel components
   */
  parseChannel(channel) {
    const validation = this.validateChannel(channel);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    const [type, id, category] = channel.split(':');
    return { type, id, category };
  }

  /**
   * Validate API key format
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { success: false, error: 'API key must be a string' };
    }

    if (!apiKey.startsWith('gai_')) {
      return { success: false, error: 'API key must start with "gai_"' };
    }

    if (apiKey.length < 20) {
      return { success: false, error: 'API key too short' };
    }

    return { success: true };
  }

  /**
   * Validate organization slug
   */
  validateOrgSlug(slug) {
    if (!slug || typeof slug !== 'string') {
      return { success: false, error: 'Organization slug must be a string' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { success: false, error: 'Organization slug contains invalid characters' };
    }

    if (slug.length < 2 || slug.length > 50) {
      return { success: false, error: 'Organization slug must be 2-50 characters' };
    }

    return { success: true };
  }

  /**
   * Format Zod validation errors
   */
  formatZodError(error) {
    return error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
  }

  /**
   * Get schema information for documentation
   */
  getSchemaInfo() {
    return {
      messageTypes: {
        PING: {
          description: 'Heartbeat message to check connection',
          schema: {
            type: 'PING',
            timestamp: 'ISO 8601 datetime (optional)'
          }
        },
        INGEST: {
          description: 'Send decision data for processing',
          schema: {
            type: 'INGEST',
            channel: 'Channel name (org:orgId:decisions)',
            schema: 'decision.v1',
            idempotencyKey: 'Unique key to prevent duplicates',
            data: 'Decision data object'
          }
        },
        SUB: {
          description: 'Subscribe to channels for real-time updates',
          schema: {
            type: 'SUB',
            channels: 'Array of channel names (max 10)'
          }
        },
        UNSUB: {
          description: 'Unsubscribe from channels',
          schema: {
            type: 'UNSUB',
            channels: 'Array of channel names'
          }
        }
      },
      decisionData: {
        description: 'Decision data for INGEST messages',
        schema: {
          orgId: 'Organization ID (required)',
          direction: 'precheck | postcheck (required)',
          decision: 'allow | transform | deny (required)',
          tool: 'Tool name (optional)',
          scope: 'Scope description (optional)',
          detectorSummary: 'Object with detection details (optional)',
          payloadHash: 'SHA256 hash of payload (required)',
          latencyMs: 'Processing latency in milliseconds (optional)',
          correlationId: 'Request correlation ID (optional)',
          tags: 'Array of tags (optional)',
          ts: 'ISO 8601 timestamp (optional)'
        }
      },
      channels: {
        description: 'Channel naming format',
        format: '{type}:{id}:{category}',
        types: ['org', 'user', 'key'],
        categories: ['decisions', 'notifications', 'usage', 'precheck', 'postcheck', 'dlq', 'approvals'],
        examples: [
          'org:acme-corp:decisions',
          'org:acme-corp:precheck',
          'org:acme-corp:postcheck',
          'org:acme-corp:dlq',
          'user:user123:notifications',
          'key:api_key456:usage'
        ]
      }
    };
  }
}
