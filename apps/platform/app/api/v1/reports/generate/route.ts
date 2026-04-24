import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@governs-ai/db';
import { resolveReportAuth, requireReportAdmin } from '@/lib/auth/report-access';
import {
  buildComplianceReportStatus,
  countActiveComplianceReportJobs,
  createComplianceReportJob,
  processComplianceReportJob,
} from '@/lib/services/compliance-report-service';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_ACTIVE_JOBS_PER_ORG = Number(
  process.env.COMPLIANCE_REPORT_MAX_ACTIVE_JOBS_PER_ORG || 3
);

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveReportAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminCheck = await requireReportAdmin(auth);
    if (!adminCheck.allowed) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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

    const activeCount = await countActiveComplianceReportJobs(auth.orgId);
    if (activeCount >= MAX_ACTIVE_JOBS_PER_ORG) {
      return NextResponse.json(
        {
          error: 'Too many compliance reports in progress. Wait for an existing report to finish.',
          retryable: true,
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '30',
          },
        }
      );
    }

    const report = await prisma.$transaction(async (tx) => {
      const created = await createComplianceReportJob(
        {
          orgId: auth.orgId,
          requestedById: auth.userId,
          startTime,
          endTime,
          source: 'on_demand',
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          orgId: auth.orgId,
          action: 'compliance.report.generate.requested',
          resource: 'compliance_report',
          details: {
            reportId: created.id,
            reportType: created.reportType,
            source: created.source,
            period: {
              startTime: startTime?.toISOString() || null,
              endTime: endTime?.toISOString() || null,
            },
          },
        },
      });

      return created;
    });

    after(async () => {
      try {
        await processComplianceReportJob(report.id);
      } catch (error) {
        console.error('Async compliance report generation failed:', error);
      }
    });

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
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
}
