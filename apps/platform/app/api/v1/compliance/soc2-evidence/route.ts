import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import {
  buildSoc2EvidenceReport,
  soc2EvidenceToCsv,
  soc2EvidenceToPdf,
} from '@/lib/services/compliance-soc2-report';

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

    const report = await buildSoc2EvidenceReport({
      orgId: auth.orgId,
      startTime,
      endTime,
      maxRecords,
    });

    const format = (searchParams.get('format') || 'csv').toLowerCase();

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        orgId: auth.orgId,
        action: 'compliance.soc2_evidence.export',
        resource: 'compliance',
        details: {
          reportType: report.reportType,
          reportId: report.reportId,
          format,
          period: report.period,
          summary: report.summary,
        },
      },
    });

    const safeTimestamp = report.generatedAt.replace(/[:.]/g, '-');

    if (format === 'pdf') {
      const pdfBuffer = soc2EvidenceToPdf(report);
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="soc2-evidence-${auth.orgId}-${safeTimestamp}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(report, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="soc2-evidence-${auth.orgId}-${safeTimestamp}.json"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const csv = soc2EvidenceToCsv(report);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="soc2-evidence-${auth.orgId}-${safeTimestamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating SOC2 evidence report:', error);
    return NextResponse.json(
      { error: 'Failed to generate SOC2 evidence report' },
      { status: 500 }
    );
  }
}
