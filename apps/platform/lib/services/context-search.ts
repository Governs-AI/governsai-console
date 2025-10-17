import { unifiedContext } from './unified-context';
import { ContextScoringService, type MemoryItem, type ScoredMemoryItem } from './context-scoring';
import { ContextFormatterService } from './context-formatter';

const DEFAULTS = {
  SIMILARITY_WEIGHT: 0.7,
  RECENCY_WEIGHT: 0.3,
  RECENCY_DECAY_DAYS: 30,
  MIN_SIMILARITY: 0.5,
  DEDUP_THRESHOLD: 0.93,
  HIGH_TIER_THRESHOLD: 0.75,
  MEDIUM_TIER_THRESHOLD: 0.60,
  LOW_TIER_THRESHOLD: 0.50,
  MAX_RESULTS: 10,
  OVERQUERY_MULTIPLIER: 3,
  TOKEN_BUDGET: 500,
  HIGH_TIER_COUNT: 5,
  MEDIUM_TIER_COUNT: 3,
  LOW_TIER_COUNT: 2,
};

export class ContextSearchService {
  private scoring: ContextScoringService;
  private formatter: ContextFormatterService;

  constructor() {
    this.scoring = new ContextScoringService(DEFAULTS);
    this.formatter = new ContextFormatterService(DEFAULTS);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    // Fallback cosine similarity for dedup groups if needed; expects normalized similarities otherwise
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  private groupDedup(items: ScoredMemoryItem[]): ScoredMemoryItem[] {
    // We only have similarity to query, not between items. Use content similarity heuristic via Jaccard on tokens.
    const groups: ScoredMemoryItem[][] = [];
    const toTokens = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean));
    const simTokens = (a: Set<string>, b: Set<string>) => {
      const inter = new Set([...a].filter((x) => b.has(x))).size;
      const uni = new Set([...a, ...b]).size || 1;
      return inter / uni; // 0..1 Jaccard
    };

    for (const item of items) {
      const tItem = toTokens(item.content);
      let placed = false;
      for (const g of groups) {
        const rep = g[0];
        const tRep = toTokens(rep.content);
        const s = simTokens(tItem, tRep);
        if (s >= DEFAULTS.DEDUP_THRESHOLD) {
          g.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([item]);
    }

    // Keep highest finalScore from each group
    return groups.map((g) => g.sort((a, b) => b.finalScore - a.finalScore)[0]);
  }

  private tierAndSelect(items: ScoredMemoryItem[]): ScoredMemoryItem[] {
    const sorted = [...items].sort((a, b) => b.finalScore - a.finalScore);
    const high = sorted.filter((i) => (i.tier === 'high')).slice(0, DEFAULTS.HIGH_TIER_COUNT);
    const medium = sorted.filter((i) => (i.tier === 'medium')).slice(0, DEFAULTS.MEDIUM_TIER_COUNT);
    const low = sorted.filter((i) => (i.tier === 'low')).slice(0, DEFAULTS.LOW_TIER_COUNT);
    return [...high, ...medium, ...low];
  }

  private buildStats(stageCounts: { total: number; afterFiltering: number; afterDedup: number; returned: number }, all: ScoredMemoryItem[]) {
    const avgSimilarity = all.length ? all.reduce((s, m) => s + m.similarity, 0) / all.length : 0;
    const avgRecency = all.length ? all.reduce((s, m) => s + m.recencyScore, 0) / all.length : 0;
    return {
      totalCandidates: stageCounts.total,
      afterFiltering: stageCounts.afterFiltering,
      afterDedup: stageCounts.afterDedup,
      returned: stageCounts.returned,
      avgSimilarity: Number(avgSimilarity.toFixed(2)),
      avgRecency: Number(avgRecency.toFixed(2)),
    };
  }

  async searchFull(params: {
    userId: string;
    orgId: string;
    query: string;
    agentId?: string;
    contentTypes?: string[];
    conversationId?: string;
    scope?: 'user' | 'org' | 'both';
    limit?: number;
    threshold?: number;
  }) {
    const limit = params.limit ?? DEFAULTS.MAX_RESULTS;
    const overquery = Math.max(limit * DEFAULTS.OVERQUERY_MULTIPLIER, limit);
    const threshold = params.threshold ?? DEFAULTS.MIN_SIMILARITY;

    // Stage 1: Raw search (overquery)
    const raw = await unifiedContext.searchContext({
      userId: params.userId,
      orgId: params.orgId,
      query: params.query,
      agentId: params.agentId,
      contentTypes: params.contentTypes,
      conversationId: params.conversationId,
      scope: params.scope || 'user',
      limit: overquery,
      threshold,
    });

    const stageTotal = raw.length;

    // Stage 2: Relevance filter with recency scoring
    const scored = this.scoring.score(raw as unknown as MemoryItem[]);
    const filtered = scored.filter((m) => m.finalScore >= 0.5);

    // Stage 3: Deduplication (content-level heuristic)
    const deduped = this.groupDedup(filtered).sort((a, b) => b.finalScore - a.finalScore);

    // Stage 4: Tiering & selection
    const tiered = this.tierAndSelect(deduped).slice(0, limit);

    const stats = this.buildStats({
      total: stageTotal,
      afterFiltering: filtered.length,
      afterDedup: deduped.length,
      returned: tiered.length,
    }, scored);

    const response = this.formatter.formatFull(tiered, stats, {
      text: params.query,
      limit,
      threshold,
    });

    return response;
  }

  async searchLLM(params: {
    userId: string;
    orgId: string;
    query: string;
    agentId?: string;
    contentTypes?: string[];
    conversationId?: string;
    scope?: 'user' | 'org' | 'both';
    limit?: number;
    threshold?: number;
  }) {
    const limit = params.limit ?? DEFAULTS.MAX_RESULTS;
    const overquery = Math.max(limit * DEFAULTS.OVERQUERY_MULTIPLIER, limit);
    const threshold = params.threshold ?? DEFAULTS.MIN_SIMILARITY;

    // Stage 1: Raw search (overquery)
    const raw = await unifiedContext.searchContext({
      userId: params.userId,
      orgId: params.orgId,
      query: params.query,
      agentId: params.agentId,
      contentTypes: params.contentTypes,
      conversationId: params.conversationId,
      scope: params.scope || 'user',
      limit: overquery,
      threshold,
    });

    // Stage 2: Score + filter
    const scored = this.scoring.score(raw as unknown as MemoryItem[]);
    const filtered = scored.filter((m) => m.finalScore >= 0.5);

    // Stage 3: Dedup
    const deduped = this.groupDedup(filtered).sort((a, b) => b.finalScore - a.finalScore);

    // Stage 4: Tier & select
    const tiered = this.tierAndSelect(deduped).slice(0, limit);

    // Stage 5: Compression
    const compressed = this.formatter.formatLLM(tiered);
    return compressed;
  }
}

export const contextSearch = new ContextSearchService();


