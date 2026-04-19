import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { getSessionFromRequest } from '@/lib/auth-utils';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3002')
  .split(',')
  .map(o => o.trim());

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ correlationId: string }> }
) {
  const origin = request.headers.get('origin');

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }

    const { correlationId } = await params;
    if (!correlationId) {
      return NextResponse.json({ error: 'correlationId is required' }, { status: 400, headers: corsHeaders(origin) });
    }

    const confirmation = await prisma.pendingConfirmation.findUnique({
      where: { correlationId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        org: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!confirmation) {
      return NextResponse.json({ error: 'Confirmation not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Users can only see their own confirmations; org admins can see their org's
    const isOwner = confirmation.userId === session.sub;
    const isOrgAdmin = confirmation.orgId === session.orgId && session.roles?.includes('admin');
    if (!isOwner && !isOrgAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(origin) });
    }

    const isExpired = new Date() > confirmation.expiresAt;
    if (isExpired && confirmation.status === 'pending') {
      await prisma.pendingConfirmation.update({
        where: { id: confirmation.id },
        data: { status: 'expired' },
      });
    }

    return NextResponse.json({
      confirmation: {
        id: confirmation.id,
        correlationId: confirmation.correlationId,
        userId: confirmation.userId,
        orgId: confirmation.orgId,
        requestType: confirmation.requestType,
        requestDesc: confirmation.requestDesc,
        requestPayload: confirmation.requestPayload,
        decision: confirmation.decision,
        reasons: confirmation.reasons,
        status: isExpired && confirmation.status === 'pending' ? 'expired' : confirmation.status,
        expiresAt: confirmation.expiresAt.toISOString(),
        createdAt: confirmation.createdAt.toISOString(),
        approvedAt: confirmation.approvedAt?.toISOString() || null,
        user: confirmation.user,
        org: confirmation.org,
      },
    }, { headers: corsHeaders(origin) });

  } catch (error) {
    console.error('Error fetching confirmation:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to fetch confirmation' }, { status: 500, headers: corsHeaders(origin) });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, { status: 200, headers: corsHeaders(origin) });
}
