import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs'; // <-- Ensure Node runtime, not Edge

import {
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// ✅ Use official helpers to avoid subtle base64/base64url bugs
// import {
//   toBuffer,
// } from '@simplewebauthn/server/helpers/iso/isoBase64URL';

import type {
  AuthenticationResponseJSON,
  VerifiedAuthenticationResponse,
  WebAuthnCredential,
  AuthenticatorTransport,
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

    // 2) Look up passkey by credential.id (which is base64url per WebAuthn spec)
    const passkey = await prisma.passkey.findFirst({
      where: {
        credentialId: credential.id,       // stored as base64url string
        userId: confirmation.userId,
        orgId: confirmation.orgId,
      },
      select: {
        id: true,
        credentialId: true,               // base64url string
        publicKey: true,                  // bytes/BLOB (COSE)
        counter: true,                    // bigint/number
        transports: true,
        deviceName: true,
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey not found or does not belong to this user' },
        { status: 400 },
      );
    }

    // 3) Hard guards before calling the lib
    if (!passkey.credentialId || !passkey.publicKey) {
      return NextResponse.json(
        { error: 'Stored passkey is missing credentialId or publicKey' },
        { status: 400 },
      );
    }

    // 4) Build credential using proper format conversion
    const webAuthnCredential: WebAuthnCredential = {
      id: passkey.credentialId, // base64url string
      publicKey: new Uint8Array(passkey.publicKey as unknown as ArrayBuffer),
      counter: Number(passkey.counter ?? 0),
      transports: (passkey.transports ?? []) as AuthenticatorTransport[],
    };

    // 5) Double-check object (optional debug)
    // console.log({ webAuthnCredential });

    // 6) Verify with strict inputs
    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: confirmation.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: webAuthnCredential, // <-- MUST be defined; helpers ensure proper shape
        requireUserVerification: true,
      });
    } catch (err: any) {
      // Most common cause: incorrect RPID/Origin or corrupt key formats
      return NextResponse.json(
        { error: 'Verification failed', details: err?.message ?? 'Unknown error' },
        { status: 400 },
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
      { expiresIn: '10m' }
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
