import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { resolveReportAuth, requireReportAdmin } from '@/lib/auth/report-access';
import {
  buildComplianceReportStatus,
  ensureComplianceReportJobReady,
  getComplianceReportDownload,
  type ComplianceReportFormat,
} from '@/lib/services/compliance-report-service';

export const runtime = 'nodejs';
export const maxDuration = 180;

function parseFormat(value: string | null): ComplianceReportFormat {
  return value === 'json' ? 'json' : 'pdf';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveReportAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminCheck = await requireReportAdmin(auth);
    if (!adminCheck.allowed) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const downloadRequested = searchParams.get('download') === '1';
    const format = parseFormat(searchParams.get('format'));

    const report = await ensureComplianceReportJobReady(id, auth.orgId);

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
          status: report.status,
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

    const asset = await getComplianceReportDownload(report, format);

    // orgId is intentionally on the audit log so PII-bearing report downloads
    // remain tenant-scoped through retention/legal-hold review queries.
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        orgId: auth.orgId,
        action: 'compliance.report.download',
        resource: 'compliance_report',
        details: {
          reportId: report.id,
          format,
          containsPii: report.containsPii,
          storage: report.pdfBlobUrl ? 'blob' : 'inline',
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
      { error: 'Failed to fetch compliance report' },
      { status: 500 }
    );
  }
}
