import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

const ALLOWED_DECISIONS = ['allow', 'transform', 'deny'] as const;
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

function parseIntParam(raw: string | null, fallback: number, { min = 0, max }: { min?: number; max?: number } = {}): number {
  if (raw === null || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  let value = parsed;
  if (typeof min === 'number' && value < min) value = min;
  if (typeof max === 'number' && value > max) value = max;
  return value;
}

function parseDateParam(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: NextRequest) {
  let orgId: string;
  try {
    ({ orgId } = await requireAuth(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const decision = searchParams.get('decision');
  const tool = searchParams.get('tool');
  const user = searchParams.get('user');
  const from = parseDateParam(searchParams.get('from'));
  const to = parseDateParam(searchParams.get('to'));
  const limit = parseIntParam(searchParams.get('limit'), DEFAULT_LIMIT, { min: 1, max: MAX_LIMIT });
  const offset = parseIntParam(searchParams.get('offset'), 0, { min: 0 });

  if (decision && !ALLOWED_DECISIONS.includes(decision as (typeof ALLOWED_DECISIONS)[number])) {
    return NextResponse.json(
      { error: `Invalid decision filter. Allowed: ${ALLOWED_DECISIONS.join(', ')}` },
      { status: 400 },
    );
  }

  if (from && to && from > to) {
    return NextResponse.json({ error: '`from` must be earlier than `to`' }, { status: 400 });
  }

  const where: Record<string, unknown> = { orgId };
  if (decision) where.decision = decision;
  if (tool) where.tool = tool;
  // Decision has no userId column; `user` maps to correlationId, the closest
  // available per-request identity marker. See GOV-586.
  if (user) where.correlationId = user;
  if (from || to) {
    const ts: Record<string, Date> = {};
    if (from) ts.gte = from;
    if (to) ts.lte = to;
    where.ts = ts;
  }

  const [events, total] = await Promise.all([
    prisma.decision.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.decision.count({ where }),
  ]);

  return NextResponse.json({
    events,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + events.length < total,
    },
  });
}
