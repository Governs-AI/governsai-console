import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { resolveConfirmationActor, serializeConfirmation } from '@/lib/confirmations';

/**
 * POST /api/v1/confirmation/:correlationId/consume
 *
 * Called by the integration (X-Governs-Key, same org) right before it runs
 * the approved action. Atomically moves approved → consumed so one approval
 * authorises exactly one execution; a replay gets 409.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ correlationId: string }> }
) {
  const actor = await resolveConfirmationActor(request);
  if (!actor || actor.kind !== 'apiKey') {
    return NextResponse.json({ error: 'X-Governs-Key required' }, { status: 401 });
  }

  const { correlationId } = await params;
  const found = await prisma.pendingConfirmation.findUnique({ where: { correlationId } });
  if (!found || found.orgId !== actor.orgId) {
    return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 });
  }

  const updated = await prisma.pendingConfirmation.updateMany({
    where: { id: found.id, status: 'approved' },
    data: { status: 'consumed', consumedAt: new Date() },
  });
  if (updated.count === 0) {
    // Re-read: a concurrent consume may have won since the first read.
    const current = await prisma.pendingConfirmation.findUnique({
      where: { id: found.id },
      select: { status: true },
    });
    const status = current?.status ?? found.status;
    return NextResponse.json(
      {
        error: status === 'consumed' ? 'Approval was already used' : `Confirmation is ${status}, not approved`,
        status,
      },
      { status: 409 },
    );
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.userId,
      orgId: found.orgId,
      action: 'confirmation.consume',
      resource: 'PendingConfirmation',
      details: { correlationId, apiKeyId: actor.apiKeyId },
    },
  });

  const fresh = await prisma.pendingConfirmation.findUniqueOrThrow({ where: { id: found.id } });
  return NextResponse.json({ success: true, confirmation: serializeConfirmation(fresh) });
}
