import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTotpToken } from '@/lib/auth';
import { requireAuth } from '@/lib/session';
import { prisma } from '@governs-ai/db';

const verifySchema = z.object({
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = requireAuth(request);
    const body = await request.json();
    const { code } = verifySchema.parse(body);

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

    // Verify the code
    const isValid = verifyTotpToken(mfaTotp.secretBase32, code);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'TOTP verified successfully',
    });

  } catch (error) {
    console.error('TOTP verify error:', error);
    
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
