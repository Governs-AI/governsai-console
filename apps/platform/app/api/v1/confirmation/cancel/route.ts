import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correlationId } = body;

    if (!correlationId) {
      return NextResponse.json(
        { error: 'correlationId is required' },
        { status: 400 }
      );
    }

    // Find the pending confirmation
    const confirmation = await prisma.pendingConfirmation.findUnique({
      where: { correlationId },
    });

    if (!confirmation) {
      return NextResponse.json(
        { error: 'Confirmation not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (confirmation.status !== 'pending') {
      return NextResponse.json(
        { error: `Confirmation already ${confirmation.status}` },
        { status: 409 }
      );
    }

    // Mark as cancelled
    await prisma.pendingConfirmation.update({
      where: { id: confirmation.id },
      data: {
        status: 'cancelled',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: confirmation.userId,
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
