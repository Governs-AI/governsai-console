import { NextRequest, NextResponse } from 'next/server';
import { processKeycloakSyncJobs } from '@/lib/keycloak-sync';

// Simple bearer-token protection for cron/worker execution
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.KEYCLOAK_SYNC_WORKER_TOKEN;
  if (!expected) return false;

  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processKeycloakSyncJobs({ limit: 50 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Keycloak sync worker endpoint failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
