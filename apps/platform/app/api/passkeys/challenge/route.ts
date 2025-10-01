import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

const RP_NAME = 'GovernsAI';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const { userId, orgId } = await requireAuth(request);

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get existing passkeys for this user+org to exclude
    const existingPasskeys = await prisma.passkey.findMany({
      where: {
        userId,
        orgId,
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
      userID: new TextEncoder().encode(userId), // Convert string to Uint8Array
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
        authenticatorAttachment: 'platform',
      },
    });

    // Store challenge in session storage (we'll use a simple approach for now)
    // In production, you might want to store this in Redis or a database table
    await prisma.pendingConfirmation.create({
      data: {
        correlationId: `passkey-reg-${userId}-${Date.now()}`,
        userId,
        orgId,
        apiKeyId: (await prisma.aPIKey.findFirst({ where: { orgId, userId } }))?.id || '',
        requestType: 'passkey_registration',
        requestDesc: 'Passkey registration challenge',
        requestPayload: { userAgent: request.headers.get('user-agent') },
        challenge: options.challenge,
        status: 'pending',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    });

    return NextResponse.json({ options });

  } catch (error) {
    console.error('Error generating registration challenge:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate registration challenge',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
