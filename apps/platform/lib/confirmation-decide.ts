import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import {
  canDecide,
  expireIfStale,
  resolveConfirmationActor,
  serializeConfirmation,
} from './confirmations';

/**
 * Approve or deny a pending confirmation as a signed-in dashboard user.
 *
 * Passkey approval (`/confirmation/verify`) stays available as the stronger
 * step-up; this path lets the requester or an org OWNER/ADMIN decide from the
 * approvals inbox. API keys are rejected so an agent cannot approve itself.
 */
export async function decideConfirmation(
  request: NextRequest,
  correlationId: string,
  outcome: 'approved' | 'denied',
) {
  const actor = await resolveConfirmationActor(request);
  if (!actor || actor.kind !== 'session') {
    return NextResponse.json(
      { error: 'Sign in to the dashboard to approve or deny requests' },
      { status: 401 },
    );
  }

  const found = await prisma.pendingConfirmation.findUnique({ where: { correlationId } });
  if (!found) {
    return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 });
  }
  if (!(await canDecide(actor, found))) {
    return NextResponse.json(
      { error: 'Only the requester or an org owner/admin can decide this request' },
      { status: 403 },
    );
  }

  const confirmation = await expireIfStale(found);
  if (confirmation.status !== 'pending') {
    return NextResponse.json(
      { error: `Confirmation already ${confirmation.status}` },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined;

  // Conditional update so two reviewers clicking at once can't both win.
  const updated = await prisma.pendingConfirmation.updateMany({
    where: { id: confirmation.id, status: 'pending' },
    data: {
      status: outcome,
      ...(outcome === 'approved' ? { approvedAt: new Date() } : {}),
    },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: 'Confirmation was decided concurrently' }, { status: 409 });
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.userId,
      orgId: confirmation.orgId,
      action: outcome === 'approved' ? 'confirmation.approve' : 'confirmation.deny',
      resource: 'PendingConfirmation',
      details: {
        correlationId: confirmation.correlationId,
        requestType: confirmation.requestType,
        requestedBy: confirmation.userId,
        method: 'session',
        ...(note ? { note } : {}),
      },
    },
  });

  const fresh = await prisma.pendingConfirmation.findUniqueOrThrow({
    where: { id: confirmation.id },
  });
  return NextResponse.json({ success: true, confirmation: serializeConfirmation(fresh) });
}
