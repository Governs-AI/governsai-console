import { NextRequest, NextResponse } from 'next/server';
import { getBudgetStatus } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Get user from session for authorization
    const { orgId } = await requireAuth(req);

    const status = await getBudgetStatus(orgId, userId || undefined);

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error fetching budget status:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch budget status' },
      { status: 500 }
    );
  }
}
