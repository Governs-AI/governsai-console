import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import {
  buildComplianceReportStatus,
  createComplianceReportJob,
  queueComplianceReportJob,
} from '@/lib/services/compliance-report-service';

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

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
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

    const report = await createComplianceReportJob({
      orgId: auth.orgId,
      requestedById: auth.userId,
      startTime,
      endTime,
      source: 'on_demand',
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        orgId: auth.orgId,
        action: 'compliance.report.generate.requested',
        resource: 'compliance_report',
        details: {
          reportId: report.id,
          reportType: report.reportType,
          source: report.source,
          period: {
            startTime: startTime?.toISOString() || null,
            endTime: endTime?.toISOString() || null,
          },
        },
      },
    });

    await queueComplianceReportJob(report.id);

    return NextResponse.json(
      {
        ...buildComplianceReportStatus(report),
        status_url: `/api/v1/reports/${report.id}`,
      },
      { status: 202, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error creating compliance report job:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate compliance report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
