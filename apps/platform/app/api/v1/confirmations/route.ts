import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';
import { serializeConfirmation } from '@/lib/confirmations';
import {
  CONFIRMATION_TRANSITIONS,
  PASSKEY_REGISTRATION_REQUEST_TYPE,
  isConfirmationStatus,
} from '@/lib/confirmation-lifecycle';

/**
 * GET /api/v1/confirmations?status=pending&limit=50
 *
 * The approvals inbox for the active org. OWNER/ADMIN see every request in
 * the org; other members see the ones they raised.
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId, roles } = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200);
    const isApprover = roles.some((r) => r === 'OWNER' || r === 'ADMIN');

    // Pending rows past their expiry are reported as expired.
    const { from, to } = CONFIRMATION_TRANSITIONS.expire;
    await prisma.pendingConfirmation.updateMany({
      where: { orgId, status: from, expiresAt: { lt: new Date() } },
      data: { status: to },
    });

    // Passkey-registration challenges share the table but are not approval requests.
    const approvalRequests = { requestType: { not: PASSKEY_REGISTRATION_REQUEST_TYPE } };
    const where = {
      orgId,
      ...approvalRequests,
      ...(isApprover ? {} : { userId }),
      ...(isConfirmationStatus(status) ? { status } : {}),
    };

    const [rows, pendingCount] = await Promise.all([
      prisma.pendingConfirmation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
          org: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.pendingConfirmation.count({
        where: {
          orgId,
          ...approvalRequests,
          status: 'pending',
          ...(isApprover ? {} : { userId }),
        },
      }),
    ]);

    return NextResponse.json({
      confirmations: rows.map((row) => ({
        ...serializeConfirmation(row),
        canDecide: isApprover || row.userId === userId,
      })),
      pendingCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error listing confirmations:', error);
    return NextResponse.json({ error: 'Failed to list confirmations' }, { status: 500 });
  }
}
