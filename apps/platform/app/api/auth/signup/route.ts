import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createUser,
  createEmailVerificationToken,
  createOrganization,
  generateOrgSlug
} from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { syncUserToKeycloak } from '@/lib/keycloak-admin';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  orgName: z.string().optional(), // Optional for team signups
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, orgName } = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(email, password, name);

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
      userName: name || email.split('@')[0],
      verifyUrl,
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail the request, but log the error
    }

    console.log(`Email verification token for ${email}: ${verificationToken}`);

    // Always create an organization for the user
    // If orgName provided, use it; otherwise create "{user_name}'s org"
    const finalOrgName = orgName || `${name || email.split('@')[0]}'s org`;
    const orgSlug = generateOrgSlug(finalOrgName);

    // Check if org slug already exists
    const existingOrg = await prisma.org.findUnique({
      where: { slug: orgSlug },
    });

    let org;
    if (existingOrg) {
      // If slug exists, append a number
      let counter = 1;
      let uniqueSlug = `${orgSlug}-${counter}`;
      while (await prisma.org.findUnique({ where: { slug: uniqueSlug } })) {
        counter++;
        uniqueSlug = `${orgSlug}-${counter}`;
      }
      org = await createOrganization(finalOrgName, uniqueSlug, user.id);
    } else {
      org = await createOrganization(finalOrgName, orgSlug, user.id);
    }

    // Sync user to Keycloak (non-blocking)
    syncUserToKeycloak({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      emailVerified: !!user.emailVerified,
      orgId: org.id,
      orgSlug: org.slug,
      role: 'OWNER',
    }).catch((error) => {
      // Log but don't block signup if Keycloak sync fails
      console.error('Keycloak sync failed during signup:', error);
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      message: 'Please check your email to verify your account',
    });

  } catch (error) {
    console.error('Signup error:', error);

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
