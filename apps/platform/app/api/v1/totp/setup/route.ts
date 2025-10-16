import { NextRequest, NextResponse } from 'next/server';
import { generateTotpSecret } from '@/lib/auth';
import { requireAuth } from '@/lib/session';
import { prisma } from '@governs-ai/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    // Check if user already has TOTP setup
    const existingTotp = await prisma.mfaTotp.findUnique({
      where: { userId },
    });

    if (existingTotp?.enabled) {
      return NextResponse.json(
        { error: 'TOTP is already enabled' },
        { status: 400 }
      );
    }

    // Generate new TOTP secret
    const { secret, qrCodeUrl } = generateTotpSecret();

    // Store or update the secret (not enabled yet)
    await prisma.mfaTotp.upsert({
      where: { userId },
      create: {
        userId,
        secretBase32: secret,
        enabled: false,
      },
      update: {
        secretBase32: secret,
        enabled: false,
      },
    });

    return NextResponse.json({
      success: true,
      secret,
      qrCodeUrl,
    });

  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
