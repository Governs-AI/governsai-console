export interface MemoryItem {
  id: string;
  content: string;
  contentType: string;
  createdAt: Date;
  agentId?: string | null;
  agentName?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, any>;
  similarity: number; // raw pgvector similarity (0..1)
}

export interface ScoredMemoryItem extends MemoryItem {
  ageInDays: number;
  recencyScore: number;
  finalScore: number;
  tier?: 'high' | 'medium' | 'low';
}

export class ContextScoringService {
  constructor(
    private readonly config = {
      SIMILARITY_WEIGHT: 0.7,
      RECENCY_WEIGHT: 0.3,
      RECENCY_DECAY_DAYS: 30,
      HIGH_TIER_THRESHOLD: 0.75,
      MEDIUM_TIER_THRESHOLD: 0.60,
      LOW_TIER_THRESHOLD: 0.50,
    }
  ) {}

  calculateRecencyScore(createdAt: Date): { recencyScore: number; ageInDays: number } {
    const now = Date.now();
    const ageMs = Math.max(0, now - new Date(createdAt).getTime());
    const ageInDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-ageInDays / this.config.RECENCY_DECAY_DAYS);
    return { recencyScore, ageInDays };
  }

  calculateFinalScore(similarity: number, recencyScore: number): number {
    const { SIMILARITY_WEIGHT, RECENCY_WEIGHT } = this.config;
    return similarity * SIMILARITY_WEIGHT + recencyScore * RECENCY_WEIGHT;
  }

  assignTier(finalScore: number): 'high' | 'medium' | 'low' | undefined {
    const { HIGH_TIER_THRESHOLD, MEDIUM_TIER_THRESHOLD, LOW_TIER_THRESHOLD } = this.config;
    if (finalScore >= HIGH_TIER_THRESHOLD) return 'high';
    if (finalScore >= MEDIUM_TIER_THRESHOLD) return 'medium';
    if (finalScore >= LOW_TIER_THRESHOLD) return 'low';
    return undefined;
  }

  score(memories: MemoryItem[]): ScoredMemoryItem[] {
    return memories.map((m) => {
      const { recencyScore, ageInDays } = this.calculateRecencyScore(m.createdAt);
      const finalScore = this.calculateFinalScore(m.similarity, recencyScore);
      const tier = this.assignTier(finalScore);
      return { ...m, recencyScore, ageInDays, finalScore, tier };
    });
  }
}


