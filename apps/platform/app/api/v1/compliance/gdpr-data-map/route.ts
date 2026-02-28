import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import { buildGdprDataMapReport, gdprDataMapToCsv } from '@/lib/services/compliance-gdpr-report';

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

function parseDate(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startTime = parseDate(searchParams.get('startTime'));
    const endTime = parseDate(searchParams.get('endTime'));

    if (searchParams.get('startTime') && !startTime) {
      return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 });
    }

    if (searchParams.get('endTime') && !endTime) {
      return NextResponse.json({ error: 'Invalid endTime' }, { status: 400 });
    }

    if (startTime && endTime && startTime > endTime) {
      return NextResponse.json(
        { error: 'startTime must be earlier than endTime' },
        { status: 400 }
      );
    }

    const rawMaxRecords = parseInt(searchParams.get('maxRecords') || '5000', 10);
    const maxRecords = Number.isNaN(rawMaxRecords) ? 5000 : rawMaxRecords;

    const report = await buildGdprDataMapReport({
      orgId: auth.orgId,
      startTime,
      endTime,
      maxRecords,
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        orgId: auth.orgId,
        action: 'compliance.gdpr_data_map.export',
        resource: 'compliance',
        details: {
          reportType: report.reportType,
          reportId: report.reportId,
          format: searchParams.get('format') || 'json',
          period: report.period,
          summary: report.summary,
        },
      },
    });

    const format = (searchParams.get('format') || 'json').toLowerCase();
    const safeTimestamp = report.generatedAt.replace(/[:.]/g, '-');

    if (format === 'csv') {
      const csv = gdprDataMapToCsv(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="gdpr-data-map-${auth.orgId}-${safeTimestamp}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return new NextResponse(JSON.stringify(report, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="gdpr-data-map-${auth.orgId}-${safeTimestamp}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating GDPR data map report:', error);
    return NextResponse.json(
      { error: 'Failed to generate GDPR data map report' },
      { status: 500 }
    );
  }
}
