import { prisma } from '@governs-ai/db';
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
      scope = 'user',
      visibility = 'private',
      expiresAt,
    } = input;

    // Step 1: Precheck the content for PII
    const precheckResult = await contextPrecheck.check({
      content,
      userId,
      orgId,
      tool: `context.${agentId}`,
      scope: 'precheck',
    });

    // If blocked, don't store
    if (precheckResult.decision === 'block' || precheckResult.decision === 'deny') {
      throw new Error(`Content blocked by precheck: ${precheckResult.reasons.join(', ')}`);
    }

    // Use redacted content if available
    const contentToStore = precheckResult.redactedContent || content;
    const piiDetected = precheckResult.piiTypes.length > 0;
    const piiRedacted = precheckResult.decision === 'redact';

    // Step 2: Generate embedding
    const embedding = await this.generateEmbedding(contentToStore);

    // Step 3: Store in database
    const context = await prisma.contextMemory.create({
      data: {
        userId,
        orgId,
        content: contentToStore,
        contentType,
        agentId,
        agentName,
        embedding: embedding as any,
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
        precheckDecision: precheckResult.decision,
      },
    });

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

    // Step 2: Build where clause
    const where: any = {
      isArchived: false,
    };

    // Scope filtering
    if (scope === 'user') {
      where.userId = userId;
      where.scope = 'user';
    } else if (scope === 'org') {
      where.orgId = orgId;
      where.scope = 'org';
    } else {
      // Both: user's private context + org's shared context
      where.OR = [
        { userId, scope: 'user' },
        { orgId, scope: 'org' },
      ];
    }

    // Agent filter
    if (agentId) {
      where.agentId = agentId;
    }

    // Content type filter
    if (contentTypes && contentTypes.length > 0) {
      where.contentType = { in: contentTypes };
    }

    // Conversation filter
    if (conversationId) {
      where.conversationId = conversationId;
    }

    // Time range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Step 3: Fetch contexts (in-memory similarity for MVP)
    // TODO: Use pgvector for native similarity search in production
    const contexts = await prisma.contextMemory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Pre-filter
      include: {
        conversation: true,
      },
    });

    // Step 4: Calculate similarity and rank
    const results = contexts
      .map((ctx: any) => {
        const ctxEmbedding = ctx.embedding as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, ctxEmbedding);
        
        // Boost recent messages slightly
        const recencyBoost = this.calculateRecencyBoost(ctx.createdAt);
        const finalScore = similarity * 0.8 + recencyBoost * 0.2;
        
        return {
          id: ctx.id,
          content: ctx.content,
          contentType: ctx.contentType,
          agentId: ctx.agentId,
          agentName: ctx.agentName,
          conversationId: ctx.conversationId,
          conversation: ctx.conversation,
          metadata: ctx.metadata,
          createdAt: ctx.createdAt,
          similarity,
          finalScore,
        };
      })
      .filter((r: any) => r.similarity >= threshold)
      .sort((a: any, b: any) => b.finalScore - a.finalScore)
      .slice(0, limit);

    // Step 5: Log access
    await prisma.contextAccessLog.create({
      data: {
        contextId: results[0]?.id || 'none',
        userId,
        orgId,
        accessType: 'search',
        query,
        resultsCount: results.length,
      },
    });

    return results;
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

    const contexts = await prisma.contextMemory.findMany({
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
    let conversation = await prisma.conversation.findFirst({
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
      conversation = await prisma.conversation.create({
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
   * Helper: Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Helper: Calculate recency boost (0-1)
   */
  private calculateRecencyBoost(createdAt: Date): number {
    const ageInMs = Date.now() - createdAt.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    
    // Exponential decay: recent = 1.0, 30 days old = 0.5, 90 days = 0.1
    return Math.exp(-ageInDays / 30);
  }

  /**
   * Helper: Update conversation metadata
   */
  private async updateConversationMetadata(conversationId: string) {
    const contexts = await prisma.contextMemory.findMany({
      where: { conversationId },
      select: { content: true },
    });

    const messageCount = contexts.length;
    const tokenCount = contexts.reduce((sum: number, ctx: any) => {
      return sum + Math.ceil(ctx.content.length / 4);
    }, 0);

    await prisma.conversation.update({
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

    const result = await prisma.contextMemory.updateMany({
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
