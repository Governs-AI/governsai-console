import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { prisma } from '@governs-ai/db';

const RP_NAME = 'GovernsAI';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

export async function GET(request: NextRequest) {
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
      where: { key: apiKey },
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

    const { user, org } = keyRecord;

    // Get existing passkeys for this user+org to exclude
    const existingPasskeys = await prisma.passkey.findMany({
      where: {
        userId: user.id,
        orgId: org.id,
      },
      select: {
        credentialId: true,
        transports: true,
      },
    });

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.id,
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map((passkey) => ({
        id: passkey.credentialId,
        type: 'public-key',
        transports: passkey.transports as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID)
      },
    });

    // Store challenge temporarily in database for verification
    // We'll use the PendingConfirmation table temporarily to store the challenge
    // (It's a bit of a hack, but avoids creating another table)
    await prisma.pendingConfirmation.create({
      data: {
        correlationId: `passkey-reg-${user.id}-${Date.now()}`,
        userId: user.id,
        orgId: org.id,
        apiKeyId: keyRecord.id,
        requestType: 'passkey_registration',
        requestDesc: 'Passkey registration challenge',
        requestPayload: { userAgent: request.headers.get('user-agent') },
        challenge: options.challenge,
        status: 'pending',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    });

    return NextResponse.json({
      options,
      userId: user.id,
      orgId: org.id,
    });

  } catch (error) {
    console.error('Error generating registration challenge:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate registration challenge',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
