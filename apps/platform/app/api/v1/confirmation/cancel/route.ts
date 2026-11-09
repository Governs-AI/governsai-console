import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import {
  canCancel,
  expireIfStale,
  resolveConfirmationActor,
  transitionConfirmation,
} from '@/lib/confirmations';

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveConfirmationActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { correlationId } = body;

    if (!correlationId) {
      return NextResponse.json(
        { error: 'correlationId is required' },
        { status: 400 }
      );
    }

    const found = await prisma.pendingConfirmation.findUnique({
      where: { correlationId },
    });

    if (!found) {
      return NextResponse.json(
        { error: 'Confirmation not found' },
        { status: 404 }
      );
    }

    if (!(await canCancel(actor, found))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const confirmation = await expireIfStale(found);
    if (confirmation.status !== 'pending') {
      return NextResponse.json(
        { error: `Confirmation already ${confirmation.status}` },
        { status: 409 }
      );
    }

    // Conditional: a reviewer approving at the same moment must not be overwritten.
    if (!(await transitionConfirmation(confirmation.id, 'cancel'))) {
      return NextResponse.json(
        { error: 'Confirmation was decided concurrently' },
        { status: 409 }
      );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: actor.userId,
        orgId: confirmation.orgId,
        action: 'confirmation.cancel',
        resource: 'PendingConfirmation',
        details: {
          correlationId: confirmation.correlationId,
          requestType: confirmation.requestType,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Confirmation cancelled successfully',
      confirmation: {
        correlationId: confirmation.correlationId,
        status: 'cancelled',
      },
    });

  } catch (error) {
    console.error('Error cancelling confirmation:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel confirmation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
