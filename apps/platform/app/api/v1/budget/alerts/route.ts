import { NextRequest, NextResponse } from 'next/server';
import { getBudgetAlerts, markBudgetAlertAsRead } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

// GET: List budget alerts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    // Get user from session for authorization
    const { userId: sessionUserId } = await requireAuth(req);

    const alerts = await getBudgetAlerts(orgId, userId || undefined, unreadOnly);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch budget alerts' },
      { status: 500 }
    );
  }
}

// POST: Mark alert as read
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId required' },
        { status: 400 }
      );
    }

    // Get user from session for authorization
    const { userId } = await requireAuth(req);

    await markBudgetAlertAsRead(alertId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to mark alert as read' },
      { status: 500 }
    );
  }
}
