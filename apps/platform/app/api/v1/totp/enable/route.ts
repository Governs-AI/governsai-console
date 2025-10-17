import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTotpToken } from '@/lib/auth';
import { requireAuth } from '@/lib/session';
import { prisma } from '@governs-ai/db';

const enableSchema = z.object({
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { code } = enableSchema.parse(body);

    // Get user's TOTP secret
    const mfaTotp = await prisma.mfaTotp.findUnique({
      where: { userId },
    });

    if (!mfaTotp) {
      return NextResponse.json(
        { error: 'TOTP not set up. Please run setup first.' },
        { status: 400 }
      );
    }

    if (mfaTotp.enabled) {
      return NextResponse.json(
        { error: 'TOTP is already enabled' },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = verifyTotpToken(mfaTotp.secretBase32, code);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 400 }
      );
    }

    // Enable TOTP
    await prisma.mfaTotp.update({
      where: { userId },
      data: { enabled: true },
    });

    return NextResponse.json({
      success: true,
      message: 'TOTP enabled successfully',
    });

  } catch (error) {
    console.error('TOTP enable error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
