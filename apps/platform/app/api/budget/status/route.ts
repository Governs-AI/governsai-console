import { NextRequest, NextResponse } from 'next/server';
import { getBudgetStatus } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const userId = searchParams.get('userId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    // Get user from session for authorization
    const { userId: sessionUserId } = await requireAuth(req);

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
