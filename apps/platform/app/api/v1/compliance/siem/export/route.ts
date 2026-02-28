import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import {
  exportAuditEventsToSiem,
  type SiemConnectorType,
  type SiemExportOptions,
} from '@/lib/services/compliance-siem-export';

export const runtime = 'nodejs';
export const maxDuration = 180;

interface AuthContext {
  userId: string;
  orgId: string;
}

async function resolveAuth(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-governs-key');
  const sessionCookie = request.cookies.get('session')?.value;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const session = verifySessionToken(token);
    if (session) {
      return { userId: session.sub, orgId: session.orgId };
    }
  }

  if (apiKeyHeader) {
    const apiKey = await prisma.aPIKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
      select: { userId: true, orgId: true },
    });

    if (apiKey) {
      return { userId: apiKey.userId, orgId: apiKey.orgId };
    }
  }

  if (sessionCookie) {
    const session = verifySessionToken(sessionCookie);
    if (session) {
      return { userId: session.sub, orgId: session.orgId };
    }
  }

  return null;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeHeaders(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const headers: Record<string, string> = {};
  for (const [rawKey, rawVal] of Object.entries(value as Record<string, unknown>)) {
    const key = asNonEmptyString(rawKey);
    const val = asNonEmptyString(rawVal);
    if (key && val) {
      headers[key] = val;
    }
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function parseConnector(value: unknown): SiemConnectorType | null {
  if (value !== 'splunk' && value !== 'elastic' && value !== 'datadog' && value !== 'webhook') {
    return null;
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const connector = parseConnector(body.connector);

    if (!connector) {
      return NextResponse.json(
        { error: 'connector must be one of: splunk, elastic, datadog, webhook' },
        { status: 400 }
      );
    }

    const startTime = parseDate(body.startTime);
    const endTime = parseDate(body.endTime);
    if (body.startTime && !startTime) {
      return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 });
    }

    if (body.endTime && !endTime) {
      return NextResponse.json({ error: 'Invalid endTime' }, { status: 400 });
    }

    if (startTime && endTime && startTime > endTime) {
      return NextResponse.json(
        { error: 'startTime must be earlier than endTime' },
        { status: 400 }
      );
    }

    const maxRecords =
      typeof body.maxRecords === 'number' && Number.isFinite(body.maxRecords)
        ? Math.floor(body.maxRecords)
        : undefined;

    const options: SiemExportOptions = {
      orgId: auth.orgId,
      connector,
      startTime,
      endTime,
      maxRecords,
      dryRun: body.dryRun === true,
      endpoint: asNonEmptyString(body.endpoint),
      token: asNonEmptyString(body.token),
      source: asNonEmptyString(body.source),
      sourcetype: asNonEmptyString(body.sourcetype),
      index: asNonEmptyString(body.index),
      apiKey: asNonEmptyString(body.apiKey),
      username: asNonEmptyString(body.username),
      password: asNonEmptyString(body.password),
      site: asNonEmptyString(body.site),
      tags: asNonEmptyString(body.tags),
      headers: sanitizeHeaders(body.headers),
      secret: asNonEmptyString(body.secret),
    };

    const result = await exportAuditEventsToSiem(options);

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        orgId: auth.orgId,
        action: 'compliance.siem.export',
        resource: 'compliance',
        details: {
          connector,
          destination: result.destination,
          exportedCount: result.exportedCount,
          dryRun: result.dryRun,
          period: result.period,
          requestId: result.requestId,
        },
      },
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error exporting audit logs to SIEM:', error);
    return NextResponse.json(
      {
        error: 'Failed to export audit logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
