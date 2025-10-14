/**
 * GovernsAI Context Memory Client
 * 
 * A simple client for interacting with the unified context memory system
 * from any GovernsAI application.
 */

export interface ContextMemoryClientConfig {
  baseUrl: string;
  apiKey?: string;
  userId: string;
  orgId: string;
  agentId: string;
  agentName: string;
}

export interface StoreContextOptions {
  content: string;
  contentType: 'user_message' | 'agent_message' | 'document' | 'decision' | 'tool_result';
  conversationId?: string;
  parentId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  scope?: 'user' | 'org';
  visibility?: 'private' | 'team' | 'org';
  expiresAt?: Date;
}

export interface SearchContextOptions {
  query: string;
  agentId?: string;
  contentTypes?: string[];
  conversationId?: string;
  scope?: 'user' | 'org' | 'both';
  limit?: number;
  threshold?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface SearchResult {
  id: string;
  content: string;
  contentType: string;
  agentId?: string;
  agentName?: string;
  conversationId?: string;
  conversation?: any;
  metadata: Record<string, any>;
  createdAt: Date;
  similarity: number;
  finalScore: number;
}

export interface Conversation {
  id: string;
  userId: string;
  orgId: string;
  agentId?: string;
  agentName?: string;
  title?: string;
  summary?: string;
  messageCount: number;
  tokenCount: number;
  cost: number;
  tags: string[];
  scope: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  isArchived: boolean;
}

export class ContextMemoryClient {
  private config: ContextMemoryClientConfig;

  constructor(config: ContextMemoryClientConfig) {
    this.config = config;
  }

  /**
   * Store context in the unified memory system
   */
  async storeContext(options: StoreContextOptions): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        content: options.content,
        contentType: options.contentType,
        agentId: this.config.agentId,
        agentName: this.config.agentName,
        conversationId: options.conversationId,
        parentId: options.parentId,
        correlationId: options.correlationId,
        metadata: options.metadata,
        scope: options.scope || 'user',
        visibility: options.visibility || 'private',
        expiresAt: options.expiresAt?.toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to store context: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result.contextId;
  }

  /**
   * Search for relevant context
   */
  async searchContext(options: SearchContextOptions): Promise<SearchResult[]> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/context/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        query: options.query,
        agentId: options.agentId,
        contentTypes: options.contentTypes,
        conversationId: options.conversationId,
        scope: options.scope || 'user',
        limit: options.limit,
        threshold: options.threshold,
        startDate: options.startDate?.toISOString(),
        endDate: options.endDate?.toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to search context: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result.results;
  }

  /**
   * Search across all agents
   */
  async searchCrossAgent(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      scope?: 'user' | 'org' | 'both';
    } = {}
  ): Promise<SearchResult[]> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/context/cross-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        query,
        limit: options.limit,
        threshold: options.threshold,
        scope: options.scope || 'user',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to search cross-agent context: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result.results;
  }

  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(title?: string): Promise<Conversation> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/context/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        agentId: this.config.agentId,
        agentName: this.config.agentName,
        title: title || `${this.config.agentName} Conversation`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create conversation: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result.conversation;
  }

  /**
   * Get conversation context
   */
  async getConversationContext(
    conversationId: string,
    options: {
      agentId?: string;
      limit?: number;
      includeParent?: boolean;
    } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams({
      conversationId,
      ...(options.agentId && { agentId: options.agentId }),
      ...(options.limit && { limit: options.limit.toString() }),
    });

    const response = await fetch(`${this.config.baseUrl}/api/v1/context/conversation?${params}`, {
      method: 'GET',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get conversation context: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    return result.contexts;
  }

  /**
   * Store a user message with automatic conversation management
   */
  async storeUserMessage(
    message: string,
    options: {
      conversationId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ contextId: string; conversationId: string }> {
    let conversationId = options.conversationId;

    // Get or create conversation if not provided
    if (!conversationId) {
      const conversation = await this.getOrCreateConversation();
      conversationId = conversation.id;
    }

    // Store the user message
    const contextId = await this.storeContext({
      content: message,
      contentType: 'user_message',
      conversationId,
      metadata: options.metadata,
    });

    return { contextId, conversationId };
  }

  /**
   * Store an agent response with automatic conversation management
   */
  async storeAgentResponse(
    response: string,
    options: {
      conversationId?: string;
      parentId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{ contextId: string; conversationId: string }> {
    let conversationId = options.conversationId;

    // Get or create conversation if not provided
    if (!conversationId) {
      const conversation = await this.getOrCreateConversation();
      conversationId = conversation.id;
    }

    // Store the agent response
    const contextId = await this.storeContext({
      content: response,
      contentType: 'agent_message',
      conversationId,
      parentId: options.parentId,
      metadata: options.metadata,
    });

    return { contextId, conversationId };
  }

  /**
   * Find relevant context for a query
   */
  async findRelevantContext(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      agentId?: string;
    } = {}
  ): Promise<SearchResult[]> {
    if (options.agentId) {
      return this.searchContext({
        query,
        agentId: options.agentId,
        limit: options.limit,
        threshold: options.threshold,
      });
    } else {
      return this.searchCrossAgent(query, {
        limit: options.limit,
        threshold: options.threshold,
      });
    }
  }
}

/**
 * Create a context memory client for a specific agent
 */
export function createContextClient(config: ContextMemoryClientConfig): ContextMemoryClient {
  return new ContextMemoryClient(config);
}

/**
 * Helper function to create a client for the demo chat app
 */
export function createDemoChatClient(baseUrl: string, userId: string, orgId: string): ContextMemoryClient {
  return new ContextMemoryClient({
    baseUrl,
    userId,
    orgId,
    agentId: 'demo-chat',
    agentName: 'Demo Chat Assistant',
  });
}

/**
 * Helper function to create a client for the platform dashboard
 */
export function createPlatformClient(baseUrl: string, userId: string, orgId: string): ContextMemoryClient {
  return new ContextMemoryClient({
    baseUrl,
    userId,
    orgId,
    agentId: 'platform',
    agentName: 'Platform Assistant',
  });
}
