import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  createUser, 
  createEmailVerificationToken, 
  createOrganization, 
  generateOrgSlug 
} from '@/lib/auth';
import { prisma } from '@governs-ai/db';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  orgName: z.string().optional(),
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

    // TODO: Send verification email
    console.log(`Email verification token for ${email}: ${verificationToken}`);

    // If orgName provided, create organization
    let org = null;
    if (orgName) {
      const orgSlug = generateOrgSlug(orgName);
      
      // Check if org slug already exists
      const existingOrg = await prisma.org.findUnique({
        where: { slug: orgSlug },
      });

      if (existingOrg) {
        return NextResponse.json(
          { error: 'Organization name already taken' },
          { status: 400 }
        );
      }

      org = await createOrganization(orgName, orgSlug, user.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      org: org ? {
        id: org.id,
        name: org.name,
        slug: org.slug,
      } : null,
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
