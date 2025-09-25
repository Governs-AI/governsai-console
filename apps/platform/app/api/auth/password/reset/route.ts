import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  consumePasswordResetToken, 
  updateUserPassword, 
  clearPasswordResetToken 
} from '@/lib/auth';

const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetSchema.parse(body);

    // Consume password reset token
    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Update password
    await updateUserPassword(userId, password);

    // Clear reset token
    await clearPasswordResetToken(userId);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error('Password reset error:', error);
    
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
