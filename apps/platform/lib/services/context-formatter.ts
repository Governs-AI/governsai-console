import type { ScoredMemoryItem } from './context-scoring';

export class ContextFormatterService {
  constructor(
    private readonly config = {
      TOKEN_BUDGET: 500,
      HIGH_TIER_COUNT: 5,
      MEDIUM_TIER_COUNT: 3,
      LOW_TIER_COUNT: 2,
    }
  ) {}

  private formatTimeAgo(days: number): string {
    if (days < 1) return 'today';
    if (days < 2) return 'yesterday';
    const rounded = Math.round(days);
    if (rounded < 7) return `${rounded} days ago`;
    const weeks = Math.round(days / 7);
    if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  formatFull(memories: ScoredMemoryItem[], stats?: Record<string, any>, query?: Record<string, any>) {
    return {
      success: true,
      memories: memories.map((m) => ({
        id: m.id,
        content: m.content,
        contentType: m.contentType,
        createdAt: m.createdAt,
        agentId: m.agentId || undefined,
        similarity: m.similarity,
        recencyScore: m.recencyScore,
        finalScore: m.finalScore,
        tier: m.tier,
        ageInDays: Math.round(m.ageInDays * 10) / 10,
      })),
      stats: stats || {},
      query: query || {},
    };
  }

  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 3.5 characters in English
    return Math.ceil(text.length / 3.5);
  }

  formatLLM(memories: ScoredMemoryItem[]) {
    const high = memories.filter((m) => m.tier === 'high').slice(0, this.config.HIGH_TIER_COUNT);
    const med = memories.filter((m) => m.tier === 'medium').slice(0, this.config.MEDIUM_TIER_COUNT);
    const low = memories.filter((m) => m.tier === 'low').slice(0, this.config.LOW_TIER_COUNT);

    const lines: string[] = [];
    lines.push('Based on your past conversations:');
    lines.push('');

    for (const m of high) {
      const when = this.formatTimeAgo(m.ageInDays);
      // Use summary if available, fallback to content
      const displayText = (m as any).summary || m.content;
      lines.push(`• ${displayText} (mentioned ${when})`);
    }

    for (const m of med) {
      // Use summary if available, fallback to content
      const displayText = (m as any).summary || m.content;
      lines.push(`• ${displayText}`);
    }

    if (low.length > 0) {
      lines.push('');
      lines.push('You may have also mentioned related preferences and habits.');
    }

    // Enforce token budget by trimming from the end if necessary
    let context = lines.join('\n');
    while (this.estimateTokens(context) > this.config.TOKEN_BUDGET && lines.length > 1) {
      lines.pop();
      context = lines.join('\n');
    }

    return {
      success: true,
      context,
      memoryCount: memories.length,
      highConfidence: high.length,
      mediumConfidence: med.length,
      lowConfidence: low.length,
      tokenEstimate: this.estimateTokens(context),
    };
  }
}


