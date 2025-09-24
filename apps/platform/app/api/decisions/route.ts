import { NextRequest, NextResponse } from 'next/server';
import { getDecisions, getDecisionStats, getLastIngestTime } from '@governs-ai/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const orgId = searchParams.get('orgId') || 'default-org';
    const direction = searchParams.get('direction') as 'precheck' | 'postcheck' | undefined;
    const decision = searchParams.get('decision') as 'allow' | 'transform' | 'deny' | undefined;
    const tool = searchParams.get('tool') || undefined;
    const correlationId = searchParams.get('correlationId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Parse time range
    const startTime = searchParams.get('startTime') 
      ? new Date(searchParams.get('startTime')!) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    const endTime = searchParams.get('endTime') 
      ? new Date(searchParams.get('endTime')!) 
      : new Date();
    
    // Check if we want stats
    const includeStats = searchParams.get('includeStats') === 'true';
    
    const filters = {
      orgId,
      direction,
      decision,
      tool,
      correlationId,
      startTime,
      endTime,
    };
    
    // Fetch decisions
    const decisions = await getDecisions(filters, limit, offset);
    
    // Fetch stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getDecisionStats(orgId, { start: startTime, end: endTime });
    }
    
    // Get last ingest time for health monitoring
    const lastIngestTime = await getLastIngestTime(orgId);
    
    return NextResponse.json({
      decisions,
      stats,
      lastIngestTime,
      pagination: {
        limit,
        offset,
        hasMore: decisions.length === limit,
      },
    });
    
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
