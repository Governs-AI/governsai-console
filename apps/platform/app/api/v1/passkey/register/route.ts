import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { prisma } from '@governs-ai/db';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';

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

    const body = await request.json();
    const { credential, deviceName } = body as {
      credential: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential required' },
        { status: 400 }
      );
    }

    // Find the pending challenge
    const pendingChallenge = await prisma.pendingConfirmation.findFirst({
      where: {
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
        requestType: 'passkey_registration',
        status: 'pending',
        expiresAt: { gte: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!pendingChallenge) {
      return NextResponse.json(
        { error: 'No valid registration challenge found' },
        { status: 400 }
      );
    }

    // Verify the registration
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: pendingChallenge.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });
    } catch (error) {
      console.error('Registration verification failed:', error);
      return NextResponse.json(
        {
          error: 'Verification failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      );
    }

    const { credentialID, credentialPublicKey, counter, aaguid } =
      verification.registrationInfo;

    // Auto-detect device name from user agent if not provided
    const userAgent = request.headers.get('user-agent') || '';
    const detectedDevice = detectDeviceName(userAgent);
    const finalDeviceName = deviceName || detectedDevice;

    // Store the passkey
    const passkey = await prisma.passkey.create({
      data: {
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
        credentialId: Buffer.from(credentialID),
        publicKey: Buffer.from(credentialPublicKey),
        counter: BigInt(counter),
        transports: credential.response.transports || [],
        deviceName: finalDeviceName,
        aaguid: aaguid || null,
      },
    });

    // Mark challenge as consumed
    await prisma.pendingConfirmation.update({
      where: { id: pendingChallenge.id },
      data: { status: 'consumed' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: keyRecord.user.id,
        orgId: keyRecord.org.id,
        action: 'passkey.register',
        resource: 'Passkey',
        details: {
          passkeyId: passkey.id,
          deviceName: finalDeviceName,
          aaguid,
        },
      },
    });

    return NextResponse.json({
      success: true,
      passkeyId: passkey.id,
      deviceName: finalDeviceName,
      message: 'Passkey registered successfully',
    });

  } catch (error) {
    console.error('Error registering passkey:', error);
    return NextResponse.json(
      {
        error: 'Failed to register passkey',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper function to detect device name from user agent
function detectDeviceName(userAgent: string): string {
  if (!userAgent) return 'Unknown Device';

  // Check for mobile devices
  if (/iPhone/.test(userAgent)) {
    const match = userAgent.match(/iPhone OS (\d+)_/);
    return match ? `iPhone (iOS ${match[1]})` : 'iPhone';
  }
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/Android/.test(userAgent)) {
    const match = userAgent.match(/Android (\d+)/);
    return match ? `Android Device (v${match[1]})` : 'Android Device';
  }

  // Check for desktop browsers
  if (/Mac OS X/.test(userAgent)) {
    if (/Chrome/.test(userAgent)) return 'Chrome on macOS';
    if (/Safari/.test(userAgent)) return 'Safari on macOS';
    if (/Firefox/.test(userAgent)) return 'Firefox on macOS';
    return 'macOS Device';
  }
  if (/Windows/.test(userAgent)) {
    if (/Chrome/.test(userAgent)) return 'Chrome on Windows';
    if (/Firefox/.test(userAgent)) return 'Firefox on Windows';
    if (/Edge/.test(userAgent)) return 'Edge on Windows';
    return 'Windows Device';
  }
  if (/Linux/.test(userAgent)) return 'Linux Device';

  return 'Unknown Device';
}
