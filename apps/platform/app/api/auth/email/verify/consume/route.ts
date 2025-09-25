import { NextRequest, NextResponse } from 'next/server';
import { consumeVerificationToken, markEmailVerified } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    // Consume verification token
    const tokenData = await consumeVerificationToken(token, 'email-verify');
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: tokenData.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark email as verified
    await markEmailVerified(user.id);

    // Get user's organizations to redirect to their dashboard
    const memberships = await prisma.orgMembership.findMany({
      where: { userId: user.id },
      include: { org: true },
      orderBy: { createdAt: 'asc' }, // First org created (their own)
    });

    const activeOrg = memberships[0]?.org;

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      activeOrgSlug: activeOrg?.slug,
    });

  } catch (error) {
    console.error('Email verification consume error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
