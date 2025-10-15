import { prisma } from '@governs-ai/db';
// Temporary typing bridge until Prisma client resolution is stable across the workspace
const dbAny = prisma as any;
import { contextPrecheck } from '@/lib/services/context-precheck';
import { UniversalEmbeddingService, createEmbeddingService, embeddingConfigs } from './embedding-service';

export interface StoreContextInput {
  userId: string;
  orgId: string;
  content: string;
  contentType: 'user_message' | 'agent_message' | 'document' | 'decision' | 'tool_result';
  
  // Agent tracking
  agentId: string; // 'demo-chat', 'platform', 'docs-chat', etc.
  agentName?: string;
  
  // Optional
  conversationId?: string;
  parentId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  precheckRef?: {
    decision: 'allow' | 'redact' | 'block' | 'deny';
    redactedContent?: string;
    piiTypes?: string[];
    reasons?: string[];
  };
  skipPrecheck?: boolean;
  
  // Scope
  scope?: 'user' | 'org';
  visibility?: 'private' | 'team' | 'org';
  
  // TTL
  expiresAt?: Date;
}

export interface SearchContextInput {
  userId: string;
  orgId: string;
  query: string;
  
  // Filters
  agentId?: string; // Search only in specific agent's context
  contentTypes?: string[];
  conversationId?: string;
  scope?: 'user' | 'org' | 'both';
  
  // Pagination
  limit?: number;
  threshold?: number; // Similarity threshold
  
  // Time range
  startDate?: Date;
  endDate?: Date;
}

export class UnifiedContextService {
  private embeddingService: UniversalEmbeddingService;

  constructor(embeddingConfig?: any) {
    // Initialize with environment-based configuration
    const config = embeddingConfig || this.getDefaultEmbeddingConfig();
    this.embeddingService = createEmbeddingService(config);
  }

  /**
   * Get default embedding configuration based on environment
   */
  private getDefaultEmbeddingConfig() {
    // Check for Ollama first (local development)
    if (process.env.OLLAMA_BASE_URL || process.env.EMBEDDING_PROVIDER === 'ollama') {
      return {
        ...embeddingConfigs.ollama,
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      };
    }

    // Check for Hugging Face
    if (process.env.HUGGINGFACE_API_KEY || process.env.EMBEDDING_PROVIDER === 'huggingface') {
      return {
        ...embeddingConfigs.huggingface,
        model: process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
      };
    }

    // Check for Cohere
    if (process.env.COHERE_API_KEY || process.env.EMBEDDING_PROVIDER === 'cohere') {
      return embeddingConfigs.cohere;
    }

    // Default to OpenAI
    return embeddingConfigs.openai;
  }

  /**
   * Generate embedding using the configured provider
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await this.embeddingService.generateEmbedding(text);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding using ${this.embeddingService.getProviderName()}`);
    }
  }

  /**
   * Store context with precheck and embedding
   */
  async storeContext(input: StoreContextInput): Promise<string> {
    const {
      userId,
      orgId,
      content,
      contentType,
      agentId,
      agentName,
      conversationId,
      parentId,
      correlationId,
      metadata = {},
      precheckRef,
      skipPrecheck,
      scope = 'user',
      visibility = 'private',
      expiresAt,
    } = input;

    // Step 1: Determine precheck outcome
    let effectiveDecision: 'allow' | 'redact' | 'block' | 'deny' = 'allow';
    let redactedContent: string | undefined;
    let piiTypes: string[] = [];
    let reasons: string[] = [];

    if (skipPrecheck) {
      // Honor provided precheckRef (from webhook) without calling adapter
      effectiveDecision = precheckRef?.decision || 'allow';
      redactedContent = precheckRef?.redactedContent;
      piiTypes = precheckRef?.piiTypes || [];
      reasons = precheckRef?.reasons || [];
    } else {
      // Call local adapter (for direct platform API usage)
      const precheckResult = await contextPrecheck.check({
        content,
        userId,
        orgId,
        tool: `context.${agentId}`,
        scope: 'precheck',
      });
      effectiveDecision = precheckResult.decision as typeof effectiveDecision;
      redactedContent = precheckResult.redactedContent;
      piiTypes = precheckResult.piiTypes;
      reasons = precheckResult.reasons;
    }

    // If blocked, don't store
    if (effectiveDecision === 'block' || effectiveDecision === 'deny') {
      throw new Error(`Content blocked by precheck: ${reasons.join(', ')}`);
    }

    // Use redacted content if available
    const contentToStore = redactedContent || content;
    const piiDetected = piiTypes.length > 0;
    const piiRedacted = effectiveDecision === 'redact';

    // Step 2: Generate embedding
    const embedding = await this.generateEmbedding(contentToStore);

    // Step 3: Store in database (save first, then set pgvector via raw SQL)
    const context = await dbAny.contextMemory.create({
      data: {
        userId,
        orgId,
        content: contentToStore,
        contentType,
        agentId,
        agentName,
        conversationId,
        parentId,
        correlationId,
        metadata,
        scope,
        visibility,
        expiresAt,
        
        // Governance
        piiDetected,
        piiRedacted,
        rawContent: piiRedacted ? content : null, // Store original if redacted
        precheckDecision: effectiveDecision,
      },
    });

    // Persist vector using pgvector casting (Unsupported type)
    try {
      const embeddingStr = `[${embedding.join(',')}]`;
      await dbAny.$executeRawUnsafe(
        `UPDATE context_memory SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        context.id
      );
    } catch (e) {
      // If vector update fails, keep the row without embedding
      console.error('Failed to set pgvector embedding:', e);
    }

    // Step 4: Update conversation metadata
    if (conversationId) {
      await this.updateConversationMetadata(conversationId);
    }

    return context.id;
  }

  /**
   * Search context across agents with semantic similarity
   */
  async searchContext(input: SearchContextInput) {
    const {
      userId,
      orgId,
      query,
      agentId,
      contentTypes,
      conversationId,
      scope = 'user',
      limit = 10,
      threshold = 0.7,
      startDate,
      endDate,
    } = input;

    // Step 1: Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Step 2: Build native pgvector SQL
    let sql = `
      SELECT
        id,
        user_id,
        org_id,
        content,
        content_type,
        agent_id,
        agent_name,
        conversation_id,
        metadata,
        created_at,
        1 - (embedding <=> $1::vector) as similarity
      FROM context_memory
      WHERE is_archived = false
    `;

    const params: any[] = [embeddingStr];
    let paramIndex = 2;

    // Scope filtering
    if (scope === 'user') {
      sql += ` AND user_id = $${paramIndex} AND scope = 'user'`;
      params.push(userId);
      paramIndex++;
    } else if (scope === 'org') {
      sql += ` AND org_id = $${paramIndex} AND scope = 'org'`;
      params.push(orgId);
      paramIndex++;
    } else {
      sql += ` AND ((user_id = $${paramIndex} AND scope = 'user') OR (org_id = $${paramIndex + 1} AND scope = 'org'))`;
      params.push(userId, orgId);
      paramIndex += 2;
    }

    if (agentId) {
      sql += ` AND agent_id = $${paramIndex}`;
      params.push(agentId);
      paramIndex++;
    }

    if (contentTypes && contentTypes.length > 0) {
      sql += ` AND content_type = ANY($${paramIndex}::text[])`;
      params.push(contentTypes);
      paramIndex++;
    }

    if (conversationId) {
      sql += ` AND conversation_id = $${paramIndex}`;
      params.push(conversationId);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ` AND 1 - (embedding <=> $1::vector) > $${paramIndex}`;
    params.push(threshold);
    paramIndex++;

    sql += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`;
    params.push(limit);

    const rows = await dbAny.$queryRawUnsafe(sql, ...params) as Array<{
      id: string;
      user_id: string;
      org_id: string;
      content: string;
      content_type: string;
      agent_id: string | null;
      agent_name: string | null;
      conversation_id: string | null;
      metadata: any;
      created_at: Date;
      similarity: string | number;
    }>;

    if (rows.length > 0) {
      await dbAny.contextAccessLog.create({
        data: {
          contextId: rows[0].id,
          userId,
          orgId,
          accessType: 'search',
          query,
          resultsCount: rows.length,
        },
      });
    }

    return rows.map((r: {
      id: string;
      user_id: string;
      org_id: string;
      content: string;
      content_type: string;
      agent_id: string | null;
      agent_name: string | null;
      conversation_id: string | null;
      metadata: any;
      created_at: Date;
      similarity: string | number;
    }) => ({
      id: r.id,
      userId: r.user_id,
      orgId: r.org_id,
      content: r.content,
      contentType: r.content_type,
      agentId: r.agent_id,
      agentName: r.agent_name,
      conversationId: r.conversation_id,
      metadata: r.metadata,
      createdAt: r.created_at,
      similarity: typeof r.similarity === 'number' ? r.similarity : parseFloat(r.similarity),
      finalScore: typeof r.similarity === 'number' ? r.similarity : parseFloat(r.similarity),
    }));
  }

  /**
   * Get conversation context (recent messages)
   * Multi-agent: Can get context from specific agent or all agents
   */
  async getConversationContext(
    conversationId: string,
    userId: string,
    orgId: string,
    options: {
      agentId?: string;
      limit?: number;
      includeParent?: boolean;
    } = {}
  ) {
    const { agentId, limit = 50, includeParent = false } = options;

    const where: any = {
      conversationId,
      userId,
      orgId,
      isArchived: false,
    };

    if (agentId) {
      where.agentId = agentId;
    }

    const contexts = await dbAny.contextMemory.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: includeParent ? { parent: true } : undefined,
    });

    return contexts;
  }

  /**
   * Get or create conversation for an agent
   * Each agent can have its own conversation threads
   */
  async getOrCreateConversation(
    userId: string,
    orgId: string,
    agentId: string,
    agentName: string,
    title?: string
  ) {
    // Get most recent active conversation for this agent
    let conversation = await dbAny.conversation.findFirst({
      where: {
        userId,
        orgId,
        agentId,
        isArchived: false,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Create new if none exists or if last message was >1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!conversation || (conversation.lastMessageAt && conversation.lastMessageAt < oneHourAgo)) {
      conversation = await dbAny.conversation.create({
        data: {
          userId,
          orgId,
          agentId,
          agentName,
          title: title || `${agentName} Conversation`,
          lastMessageAt: new Date(),
        },
      });
    }

    return conversation;
  }

  /**
   * Cross-agent context search
   * Search across all agents a user has interacted with
   */
  async searchCrossAgent(
    userId: string,
    orgId: string,
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      scope?: 'user' | 'org' | 'both';
    } = {}
  ) {
    return this.searchContext({
      userId,
      orgId,
      query,
      // No agentId filter = search across all agents
      scope: options.scope || 'user',
      limit: options.limit || 10,
      threshold: options.threshold || 0.7,
    });
  }


  /**
   * Helper: Update conversation metadata
   */
  private async updateConversationMetadata(conversationId: string) {
    const contexts = await dbAny.contextMemory.findMany({
      where: { conversationId },
      select: { content: true },
    });

    const messageCount = contexts.length;
    const tokenCount = contexts.reduce((sum: number, ctx: any) => {
      return sum + Math.ceil(ctx.content.length / 4);
    }, 0);

    await dbAny.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount,
        tokenCount,
        lastMessageAt: new Date(),
      },
    });
  }

  /**
   * Archive old context (cleanup job)
   */
  async archiveOldContext(daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await dbAny.contextMemory.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });

    return result.count;
  }
}

export const unifiedContext = new UnifiedContextService();
