import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createEmailVerificationToken } from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = requestSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Create verification token
    const verificationToken = await createEmailVerificationToken(
      email,
      'email-verify'
    );

    // Send verification email
    const { sendVerificationEmail } = await import('@/lib/email');
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;

    const emailResult = await sendVerificationEmail({
      to: email,
      userName: user.name || email.split('@')[0],
      verifyUrl,
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail the request, but log the error
    }

    console.log(`Email verification token for ${email}: ${verificationToken}`);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });

  } catch (error) {
    console.error('Email verification request error:', error);

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
