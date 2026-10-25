import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';
import { hashApiKey } from '@/lib/api-keys';

export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-Governs-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Find API key and get user/org
    const keyRecord = await prisma.aPIKey.findUnique({
      where: { keyHash: hashApiKey(apiKey) },
      include: {
        user: true,
        org: true,
      },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      correlationId,
      requestType,
      requestDesc,
      requestPayload,
      decision = 'confirm',
      reasons = [],
      expiresInSeconds,
    } = body;

    // Human approval needs more than a few minutes; default 15m, cap 24h.
    const ttlSeconds = Math.min(
      Math.max(Number(expiresInSeconds) || 15 * 60, 60),
      24 * 60 * 60,
    );

    if (!correlationId || !requestType || !requestDesc) {
      return NextResponse.json(
        { error: 'Missing required fields: correlationId, requestType, requestDesc' },
        { status: 400 }
      );
    }

    // Check if confirmation already exists
    const existing = await prisma.pendingConfirmation.findUnique({
      where: { correlationId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Confirmation already exists for this correlationId' },
        { status: 409 }
      );
    }

    // Generate a random challenge for WebAuthn authentication
    const challenge = randomBytes(32).toString('base64url');

    // Create pending confirmation
    const confirmation = await prisma.pendingConfirmation.create({
      data: {
        correlationId,
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
        apiKeyId: keyRecord.id,
        requestType,
        requestDesc,
        requestPayload: requestPayload || {},
        decision,
        reasons,
        challenge,
        status: 'pending',
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
        action: 'confirmation.create',
        resource: 'PendingConfirmation',
        details: {
          correlationId,
          requestType,
          decision,
        },
      },
    });

    return NextResponse.json({
      success: true,
      confirmation: {
        id: confirmation.id,
        correlationId: confirmation.correlationId,
        requestType: confirmation.requestType,
        requestDesc: confirmation.requestDesc,
        decision: confirmation.decision,
        reasons: confirmation.reasons,
        status: confirmation.status,
        expiresAt: confirmation.expiresAt.toISOString(),
        createdAt: confirmation.createdAt.toISOString(),
      },
      // Where a reviewer approves it; the inbox lists it too.
      confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/confirm/${confirmation.correlationId}`,
      approvalsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/o/${keyRecord.org.slug}/approvals`,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error creating confirmation:', error);
    return NextResponse.json(
      {
        error: 'Failed to create confirmation',
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
