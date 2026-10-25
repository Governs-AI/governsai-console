import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';
import { serializeConfirmation } from '@/lib/confirmations';

const STATUSES = ['pending', 'approved', 'denied', 'expired', 'cancelled', 'consumed'];

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
    await prisma.pendingConfirmation.updateMany({
      where: { orgId, status: 'pending', expiresAt: { lt: new Date() } },
      data: { status: 'expired' },
    });

    const where = {
      orgId,
      ...(isApprover ? {} : { userId }),
      ...(status && STATUSES.includes(status) ? { status } : {}),
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
        where: { orgId, status: 'pending', ...(isApprover ? {} : { userId }) },
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
