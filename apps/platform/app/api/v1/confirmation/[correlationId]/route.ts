import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';

export async function GET(
  request: NextRequest,
  {params}: { params: Promise<{ correlationId: string }> }
) {
  try {

    const queryParams = await params;
    const { correlationId } = queryParams;

    if (!correlationId) {
      return NextResponse.json(
        { error: 'correlationId is required' },
        { status: 400 }
      );
    }

    // Find the confirmation
    const confirmation = await prisma.pendingConfirmation.findUnique({
      where: { correlationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!confirmation) {
      return NextResponse.json(
        { error: 'Confirmation not found' },
        { status: 404 }
      );
    }

    // Check if expired
    const isExpired = new Date() > confirmation.expiresAt;

    // If expired and still pending, mark as expired
    if (isExpired && confirmation.status === 'pending') {
      await prisma.pendingConfirmation.update({
        where: { id: confirmation.id },
        data: { status: 'expired' },
      });
    }

    // Return confirmation details (excluding sensitive fields like challenge and confirmationToken)
    return NextResponse.json({
      confirmation: {
        id: confirmation.id,
        correlationId: confirmation.correlationId,
        userId: confirmation.userId,
        orgId: confirmation.orgId,
        requestType: confirmation.requestType,
        requestDesc: confirmation.requestDesc,
        requestPayload: confirmation.requestPayload,
        decision: confirmation.decision,
        reasons: confirmation.reasons,
        status: isExpired && confirmation.status === 'pending' ? 'expired' : confirmation.status,
        expiresAt: confirmation.expiresAt.toISOString(),
        createdAt: confirmation.createdAt.toISOString(),
        approvedAt: confirmation.approvedAt?.toISOString() || null,
        user: confirmation.user,
        org: confirmation.org,
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error fetching confirmation:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch confirmation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
