import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import {
  buildComplianceReportStatus,
  ensureComplianceReportJobReady,
  findComplianceReportJob,
  getComplianceReportDownload,
  type ComplianceReportFormat,
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

function parseFormat(value: string | null): ComplianceReportFormat {
  return value === 'json' ? 'json' : 'pdf';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const downloadRequested = searchParams.get('download') === '1';
    const format = parseFormat(searchParams.get('format'));

    const report = downloadRequested
      ? await ensureComplianceReportJobReady(id, auth.orgId)
      : await findComplianceReportJob(id, auth.orgId);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (!downloadRequested) {
      return NextResponse.json(buildComplianceReportStatus(report), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (report.status === 'failed') {
      return NextResponse.json(
        {
          error: 'Report generation failed',
          details: report.errorMessage || 'Unknown error',
        },
        { status: 409 }
      );
    }

    if (report.status !== 'ready') {
      return NextResponse.json(
        {
          error: 'Report is still processing',
          status: report.status,
        },
        { status: 409 }
      );
    }

    const asset = getComplianceReportDownload(report, format);

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        orgId: auth.orgId,
        action: 'compliance.report.download',
        resource: 'compliance_report',
        details: {
          reportId: report.id,
          format,
        },
      },
    });

    return new NextResponse(asset.body, {
      headers: {
        'Content-Type': asset.contentType,
        'Content-Disposition': `attachment; filename="${asset.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch compliance report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
