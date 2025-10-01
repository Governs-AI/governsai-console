import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import { prisma } from '@governs-ai/db';
import jwt from 'jsonwebtoken';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correlationId, credential } = body as {
      correlationId: string;
      credential: AuthenticationResponseJSON;
    };

    if (!correlationId || !credential) {
      return NextResponse.json(
        { error: 'correlationId and credential are required' },
        { status: 400 }
      );
    }

    // Find the pending confirmation
    const confirmation = await prisma.pendingConfirmation.findUnique({
      where: { correlationId },
      include: {
        user: true,
        org: true,
      },
    });

    if (!confirmation) {
      return NextResponse.json(
        { error: 'Confirmation not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > confirmation.expiresAt) {
      await prisma.pendingConfirmation.update({
        where: { id: confirmation.id },
        data: { status: 'expired' },
      });
      return NextResponse.json(
        { error: 'Confirmation has expired' },
        { status: 410 }
      );
    }

    // Check if already processed
    if (confirmation.status !== 'pending') {
      return NextResponse.json(
        { error: `Confirmation already ${confirmation.status}` },
        { status: 409 }
      );
    }

    // Find the passkey being used (from credential.id)
    const credentialIdBuffer = Buffer.from(credential.id, 'base64url');

    const passkey = await prisma.passkey.findFirst({
      where: {
        credentialId: credentialIdBuffer,
        userId: confirmation.userId,
        orgId: confirmation.orgId,
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey not found or does not belong to this user' },
        { status: 400 }
      );
    }

    // Verify the authentication
    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: confirmation.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: passkey.credentialId,
          credentialPublicKey: passkey.publicKey,
          counter: Number(passkey.counter),
          transports: passkey.transports as AuthenticatorTransport[],
        },
      });
    } catch (error) {
      console.error('Authentication verification failed:', error);
      return NextResponse.json(
        {
          error: 'Verification failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Update passkey counter and lastUsedAt
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Generate confirmation token (JWT)
    const confirmationToken = jwt.sign(
      {
        correlationId: confirmation.correlationId,
        userId: confirmation.userId,
        orgId: confirmation.orgId,
        passkeyId: passkey.id,
        type: 'confirmation',
      },
      JWT_SECRET,
      { expiresIn: '10m' } // Token valid for 10 minutes
    );

    // Mark confirmation as approved
    await prisma.pendingConfirmation.update({
      where: { id: confirmation.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        passkeyId: passkey.id,
        confirmationToken,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: confirmation.userId,
        orgId: confirmation.orgId,
        action: 'confirmation.approve',
        resource: 'PendingConfirmation',
        details: {
          correlationId: confirmation.correlationId,
          requestType: confirmation.requestType,
          passkeyId: passkey.id,
          deviceName: passkey.deviceName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Confirmation approved successfully',
      confirmationToken,
      confirmation: {
        correlationId: confirmation.correlationId,
        status: 'approved',
        approvedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error verifying confirmation:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify confirmation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
