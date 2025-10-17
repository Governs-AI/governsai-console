import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { prisma } from '@governs-ai/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    // Get current TOTP status
    const totpRecord = await prisma.mfaTotp.findUnique({
      where: { userId },
      select: {
        enabled: true,
        secretBase32: true,
      },
    });

    return NextResponse.json({
      enabled: totpRecord?.enabled || false,
      secret: totpRecord?.secretBase32 || null,
    });

  } catch (error) {
    console.error('TOTP status check error:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
