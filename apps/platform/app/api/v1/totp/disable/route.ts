import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTotpToken } from '@/lib/auth';
import { requireAuth } from '@/lib/session';
import { prisma } from '@governs-ai/db';

const disableSchema = z.object({
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { code } = disableSchema.parse(body);

    // Get user's TOTP secret
    const mfaTotp = await prisma.mfaTotp.findUnique({
      where: { userId },
    });

    if (!mfaTotp || !mfaTotp.enabled) {
      return NextResponse.json(
        { error: 'TOTP not enabled' },
        { status: 400 }
      );
    }

    // Verify the code before disabling
    const isValid = verifyTotpToken(mfaTotp.secretBase32, code);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 400 }
      );
    }

    // Disable TOTP
    await prisma.mfaTotp.update({
      where: { userId },
      data: { enabled: false },
    });

    return NextResponse.json({
      success: true,
      message: 'TOTP disabled successfully',
    });

  } catch (error) {
    console.error('TOTP disable error:', error);
    
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
