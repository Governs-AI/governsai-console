/**
 * REFRAG Analytics Service
 *
 * Tracks and analyzes REFRAG performance metrics:
 * - Token savings
 * - Retrieval latency
 * - Compression ratios
 * - Usage patterns
 */

import { prisma } from '@governs-ai/db';

export interface RefragSearchLog {
  userId: string;
  orgId: string;
  query: string;
  totalChunks: number;
  expandedChunks: number;
  compressedChunks: number;
  tokenSavings: number;
  tokenSavingsPercent: number;
  latencyMs: number;
  compressionRatio: number;
  agentId?: string;
  conversationId?: string;
}

export interface RefragStats {
  totalSearches: number;
  avgTokenSavings: number;
  avgTokenSavingsPercent: number;
  avgLatency: number;
  avgCompressionRatio: number;
  avgExpandedChunks: number;
  avgCompressedChunks: number;
  totalTokensSaved: number;
}

export class RefragAnalyticsService {
  /**
   * Log a REFRAG search event
   *
   * @param data - Search log data
   */
  async logSearch(data: RefragSearchLog): Promise<void> {
    try {
      await prisma.refragAnalytics.create({
        data: {
          id: `refrag-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          userId: data.userId,
          orgId: data.orgId,
          query: data.query,
          totalChunks: data.totalChunks,
          expandedChunks: data.expandedChunks,
          compressedChunks: data.compressedChunks,
          tokenSavings: data.tokenSavingsPercent, // Store as percentage
          latencyMs: data.latencyMs,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Don't fail the search if analytics logging fails
      console.error('Failed to log REFRAG analytics:', error);
    }
  }

  /**
   * Get REFRAG statistics for a user
   *
   * @param userId - User ID
   * @param days - Number of days to look back (default: 7)
   * @returns Statistics object
   */
  async getStats(userId: string, days: number = 7): Promise<RefragStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const stats = await prisma.refragAnalytics.aggregate({
        where: {
          userId,
          timestamp: { gte: since },
        },
        _count: { id: true },
        _avg: {
          tokenSavings: true,
          latencyMs: true,
          expandedChunks: true,
          compressedChunks: true,
        },
        _sum: {
          tokenSavings: true,
          totalChunks: true,
        },
      });

      const avgCompressionRatio = stats._avg.compressedChunks && stats._avg.expandedChunks
        ? stats._avg.compressedChunks / (stats._avg.compressedChunks + stats._avg.expandedChunks)
        : 0;

      return {
        totalSearches: stats._count.id || 0,
        avgTokenSavings: 0, // Calculated from percentage
        avgTokenSavingsPercent: stats._avg.tokenSavings || 0,
        avgLatency: stats._avg.latencyMs || 0,
        avgCompressionRatio: avgCompressionRatio,
        avgExpandedChunks: stats._avg.expandedChunks || 0,
        avgCompressedChunks: stats._avg.compressedChunks || 0,
        totalTokensSaved: 0, // Would need to track actual tokens
      };
    } catch (error) {
      console.error('Failed to get REFRAG stats:', error);
      return {
        totalSearches: 0,
        avgTokenSavings: 0,
        avgTokenSavingsPercent: 0,
        avgLatency: 0,
        avgCompressionRatio: 0,
        avgExpandedChunks: 0,
        avgCompressedChunks: 0,
        totalTokensSaved: 0,
      };
    }
  }

  /**
   * Get REFRAG statistics for an organization
   *
   * @param orgId - Organization ID
   * @param days - Number of days to look back (default: 7)
   * @returns Statistics object
   */
  async getOrgStats(orgId: string, days: number = 7): Promise<RefragStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const stats = await prisma.refragAnalytics.aggregate({
        where: {
          orgId,
          timestamp: { gte: since },
        },
        _count: { id: true },
        _avg: {
          tokenSavings: true,
          latencyMs: true,
          expandedChunks: true,
          compressedChunks: true,
        },
        _sum: {
          tokenSavings: true,
          totalChunks: true,
        },
      });

      const avgCompressionRatio = stats._avg.compressedChunks && stats._avg.expandedChunks
        ? stats._avg.compressedChunks / (stats._avg.compressedChunks + stats._avg.expandedChunks)
        : 0;

      return {
        totalSearches: stats._count.id || 0,
        avgTokenSavings: 0,
        avgTokenSavingsPercent: stats._avg.tokenSavings || 0,
        avgLatency: stats._avg.latencyMs || 0,
        avgCompressionRatio: avgCompressionRatio,
        avgExpandedChunks: stats._avg.expandedChunks || 0,
        avgCompressedChunks: stats._avg.compressedChunks || 0,
        totalTokensSaved: 0,
      };
    } catch (error) {
      console.error('Failed to get org REFRAG stats:', error);
      return {
        totalSearches: 0,
        avgTokenSavings: 0,
        avgTokenSavingsPercent: 0,
        avgLatency: 0,
        avgCompressionRatio: 0,
        avgExpandedChunks: 0,
        avgCompressedChunks: 0,
        totalTokensSaved: 0,
      };
    }
  }

  /**
   * Get recent REFRAG search history
   *
   * @param userId - User ID
   * @param limit - Number of records to return (default: 10)
   * @returns Array of search logs
   */
  async getRecentSearches(userId: string, limit: number = 10) {
    try {
      const searches = await prisma.refragAnalytics.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
          id: true,
          query: true,
          totalChunks: true,
          expandedChunks: true,
          compressedChunks: true,
          tokenSavings: true,
          latencyMs: true,
          timestamp: true,
        },
      });

      return searches;
    } catch (error) {
      console.error('Failed to get recent REFRAG searches:', error);
      return [];
    }
  }

  /**
   * Delete old analytics data
   *
   * @param days - Delete data older than N days (default: 90)
   * @returns Number of records deleted
   */
  async cleanup(days: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    try {
      const result = await prisma.refragAnalytics.deleteMany({
        where: {
          timestamp: { lt: cutoff },
        },
      });

      console.log(`🧹 Cleaned up ${result.count} REFRAG analytics records older than ${days} days`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup REFRAG analytics:', error);
      return 0;
    }
  }
}

/**
 * Singleton instance
 */
export const refragAnalytics = new RefragAnalyticsService();

/**
 * Helper function to log a REFRAG search
 */
export async function logRefragSearch(data: RefragSearchLog): Promise<void> {
  return refragAnalytics.logSearch(data);
}

/**
 * Helper function to get REFRAG stats
 */
export async function getRefragStats(userId: string, days?: number): Promise<RefragStats> {
  return refragAnalytics.getStats(userId, days);
}
