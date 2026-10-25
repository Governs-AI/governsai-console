import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import {
  canDecide,
  canView,
  expireIfStale,
  resolveConfirmationActor,
  serializeConfirmation,
} from '@/lib/confirmations';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3002')
  .split(',')
  .map(o => o.trim());

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Governs-Key',
    'Vary': 'Origin',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ correlationId: string }> }
) {
  const origin = request.headers.get('origin');

  try {
    // Session (dashboard) or X-Governs-Key (the integration polling its own request)
    const actor = await resolveConfirmationActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }

    const { correlationId } = await params;
    if (!correlationId) {
      return NextResponse.json({ error: 'correlationId is required' }, { status: 400, headers: corsHeaders(origin) });
    }

    const found = await prisma.pendingConfirmation.findUnique({
      where: { correlationId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        org: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!found) {
      return NextResponse.json({ error: 'Confirmation not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    if (!(await canView(actor, found))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(origin) });
    }

    const confirmation = await expireIfStale(found);
    return NextResponse.json({
      confirmation: {
        ...serializeConfirmation(confirmation),
        canDecide: await canDecide(actor, confirmation),
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
