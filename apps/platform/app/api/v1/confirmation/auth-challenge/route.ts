import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { prisma } from '@governs-ai/db';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

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

    // Get user's passkeys for this org
    const passkeys = await prisma.passkey.findMany({
      where: {
        userId: confirmation.userId,
        orgId: confirmation.orgId,
      },
    });

    if (passkeys.length === 0) {
      return NextResponse.json(
        { error: 'No passkeys registered. Please register a passkey first.' },
        { status: 400 }
      );
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'required',
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        type: 'public-key',
        transports: passkey.transports as AuthenticatorTransport[],
      })),
    });

    // Update the challenge in the confirmation
    await prisma.pendingConfirmation.update({
      where: { id: confirmation.id },
      data: { challenge: options.challenge },
    });

    return NextResponse.json({
      options,
      confirmation: {
        correlationId: confirmation.correlationId,
        requestDesc: confirmation.requestDesc,
        requestType: confirmation.requestType,
        reasons: confirmation.reasons,
      },
    });

  } catch (error) {
    console.error('Error generating auth challenge:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate auth challenge',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
