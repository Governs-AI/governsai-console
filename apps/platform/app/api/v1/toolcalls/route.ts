import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const orgId = searchParams.get('orgId') || 'default-org';
        const tool = searchParams.get('tool') || undefined;
        const timeRange = searchParams.get('timeRange') || '24h';
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Parse time range
        const now = new Date();
        let startTime: Date;

        switch (timeRange) {
            case '1h':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        // Check if we want stats
        const includeStats = searchParams.get('includeStats') === 'true';

        // Build where clause
        const where: any = {
            orgId,
            ts: {
                gte: startTime,
                lte: now,
            },
            tool: {
                not: null, // Only include decisions that have a tool
            },
        };

        if (tool) {
            where.tool = tool;
        }

        // Fetch toolcalls (decisions with tools)
        const toolcalls = await prisma.decision.findMany({
            where,
            orderBy: { ts: 'desc' },
            take: limit,
            skip: offset,
        });

        // Calculate stats if requested
        let stats = null;
        if (includeStats) {
            const [
                totalToolcalls,
                toolcallsByTool,
                toolcallsByDecision,
                avgLatency,
                lastToolcallTime
            ] = await Promise.all([
                // Total toolcalls
                prisma.decision.count({
                    where: {
                        ...where,
                        tool: { not: null },
                    },
                }),

                // Toolcalls by tool
                prisma.decision.groupBy({
                    by: ['tool'],
                    where: {
                        ...where,
                        tool: { not: null },
                    },
                    _count: true,
                }),

                // Toolcalls by decision type
                prisma.decision.groupBy({
                    by: ['decision'],
                    where: {
                        ...where,
                        tool: { not: null },
                    },
                    _count: true,
                }),

                // Average latency
                prisma.decision.aggregate({
                    where: {
                        ...where,
                        tool: { not: null },
                        latencyMs: { not: null },
                    },
                    _avg: {
                        latencyMs: true,
                    },
                }),

                // Last toolcall time
                prisma.decision.findFirst({
                    where: {
                        ...where,
                        tool: { not: null },
                    },
                    orderBy: { ts: 'desc' },
                    select: { ts: true },
                }),
            ]);

            // Transform toolcalls by tool
            const byTool: Record<string, number> = {};
            toolcallsByTool.forEach(item => {
                if (item.tool) {
                    byTool[item.tool] = item._count;
                }
            });

            // Transform toolcalls by decision
            const byDecision: Record<string, number> = {};
            toolcallsByDecision.forEach(item => {
                byDecision[item.decision] = item._count;
            });

            stats = {
                total: totalToolcalls,
                byTool,
                byDecision,
                avgLatency: Math.round(avgLatency._avg.latencyMs || 0),
                lastToolcallTime: lastToolcallTime?.ts || null,
            };
        }

        return NextResponse.json({
            toolcalls,
            stats,
            lastIngestTime: stats?.lastToolcallTime,
            pagination: {
                limit,
                offset,
                hasMore: toolcalls.length === limit,
            },
        });

    } catch (error) {
        console.error('Error fetching toolcalls:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
