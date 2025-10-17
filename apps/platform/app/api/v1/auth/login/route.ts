import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  verifyUserPassword, 
  createSessionToken, 
  getUserOrganizations 
} from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, totpCode } = loginSchema.parse(body);

    // Verify user credentials
    const user = await verifyUserPassword(email, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 401 }
      );
    }

    // Check TOTP if enabled
    const mfaTotp = await prisma.mfaTotp.findUnique({
      where: { userId: user.id },
    });

    if (mfaTotp?.enabled) {
      if (!totpCode) {
        return NextResponse.json(
          { error: 'TOTP code required', requiresMfa: true },
          { status: 401 }
        );
      }

      const isValidTotp = require('speakeasy').totp.verify({
        secret: mfaTotp.secretBase32,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });

      if (!isValidTotp) {
        return NextResponse.json(
          { error: 'Invalid TOTP code' },
          { status: 401 }
        );
      }
    }

    // Get user's organizations
    const memberships = await getUserOrganizations(user.id);
    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'No organizations found. Please contact support.' },
        { status: 403 }
      );
    }

    // Use the first organization as default (could be improved with user preference)
    const activeOrg = memberships[0];
    const roles = memberships.map(m => m.role);

    // Create session token
    const sessionToken = createSessionToken(
      user.id,
      activeOrg.orgId,
      roles
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      organizations: memberships.map(m => ({
        id: m.org.id,
        name: m.org.name,
        slug: m.org.slug,
        role: m.role,
      })),
      activeOrg: {
        id: activeOrg.org.id,
        name: activeOrg.org.name,
        slug: activeOrg.org.slug,
        role: activeOrg.role,
      },
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60, // 2 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
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
