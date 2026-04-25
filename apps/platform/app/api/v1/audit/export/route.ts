import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireRole } from '@/lib/session';

const ALLOWED_DECISIONS = ['allow', 'transform', 'deny'] as const;
const ALLOWED_FORMATS = ['csv'] as const;
const CHUNK_SIZE = 500;
const EXPORT_ROLE = 'ADMIN';

const CSV_HEADERS = [
  'id',
  'ts',
  'orgId',
  'decision',
  'direction',
  'tool',
  'scope',
  'policyId',
  'correlationId',
  'latencyMs',
  'payloadHash',
  'reasons',
  'tags',
  'detectorSummary',
] as const;

function parseDateParam(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// CWE-1236: spreadsheet formula injection. Excel/LibreOffice/Sheets evaluate
// any cell whose first character is `=`, `+`, `-`, `@`, or a tab as a formula.
// Prefixing with a literal tab forces the engine to treat the cell as text.
const FORMULA_LEAD = /^[=+\-@\t]/;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === 'object') {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  if (FORMULA_LEAD.test(s)) {
    s = `\t${s}`;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(row: Record<string, unknown>): string {
  return CSV_HEADERS.map((h) => csvEscape(row[h])).join(',') + '\n';
}

export async function GET(request: NextRequest) {
  let orgId: string;
  try {
    ({ orgId } = await requireRole(request, EXPORT_ROLE));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('Role ')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const format = (searchParams.get('format') ?? 'csv').toLowerCase();
  if (!ALLOWED_FORMATS.includes(format as (typeof ALLOWED_FORMATS)[number])) {
    return NextResponse.json(
      { error: `Unsupported format. Allowed: ${ALLOWED_FORMATS.join(', ')}` },
      { status: 400 },
    );
  }

  const decision = searchParams.get('decision');
  const tool = searchParams.get('tool');
  const user = searchParams.get('user');
  const from = parseDateParam(searchParams.get('from'));
  const to = parseDateParam(searchParams.get('to'));

  if (decision && !ALLOWED_DECISIONS.includes(decision as (typeof ALLOWED_DECISIONS)[number])) {
    return NextResponse.json(
      { error: `Invalid decision filter. Allowed: ${ALLOWED_DECISIONS.join(', ')}` },
      { status: 400 },
    );
  }

  if (from && to && from > to) {
    return NextResponse.json(
      { error: '`from` must be earlier than `to`' },
      { status: 400 },
    );
  }

  const where: Record<string, unknown> = { orgId };
  if (decision) where.decision = decision;
  if (tool) where.tool = tool;
  if (user) where.correlationId = user;
  if (from || to) {
    const ts: Record<string, Date> = {};
    if (from) ts.gte = from;
    if (to) ts.lte = to;
    where.ts = ts;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(CSV_HEADERS.join(',') + '\n'));

        let cursor: { id: string } | undefined;
        // Cursor pagination on the unique `id` keeps memory bounded at CHUNK_SIZE
        // rows per iteration, even for exports of hundreds of thousands of rows.
        while (true) {
          const rows: Array<Record<string, unknown> & { id: string }> =
            await prisma.decision.findMany({
              where,
              orderBy: [{ ts: 'desc' }, { id: 'desc' }],
              take: CHUNK_SIZE,
              ...(cursor ? { cursor, skip: 1 } : {}),
            });
          if (rows.length === 0) break;
          for (const row of rows) {
            controller.enqueue(encoder.encode(rowToCsv(row)));
          }
          if (rows.length < CHUNK_SIZE) break;
          cursor = { id: rows[rows.length - 1].id };
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  const filename = `audit-export-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.csv`;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
