import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    createUser,
    consumeVerificationToken,
    addUserToOrganization,
    createEmailVerificationToken
} from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { syncUserToKeycloak } from '@/lib/keycloak-admin';

const invitedSignupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
    inviteToken: z.string(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name, inviteToken } = invitedSignupSchema.parse(body);

        // Validate invitation token first
        const tokenData = await consumeVerificationToken(inviteToken, 'invite');
        if (!tokenData) {
            return NextResponse.json(
                { error: 'Invalid or expired invitation token' },
                { status: 400 }
            );
        }

        const { email: invitedEmail, orgId, role } = tokenData;

        // Verify email matches invitation
        if (email.toLowerCase() !== invitedEmail.toLowerCase()) {
            return NextResponse.json(
                { error: 'Email does not match invitation' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists. Please log in instead.' },
                { status: 400 }
            );
        }

        // Check if user is already a member of the organization
        const existingMembership = await prisma.orgMembership.findUnique({
            where: {
                orgId_userId: {
                    orgId: orgId!,
                    userId: existingUser?.id || '',
                },
            },
        });

        if (existingMembership) {
            return NextResponse.json(
                { error: 'User is already a member of this organization' },
                { status: 400 }
            );
        }

        // Create user
        const user = await createUser(email, password, name);

        // Add user to organization immediately
        const membership = await addUserToOrganization(user.id, orgId!, role as any);

        // Get organization details
        const org = await prisma.org.findUnique({
            where: { id: orgId },
        });

        // Create email verification token
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

        // Sync user to Keycloak with organization context (non-blocking)
        if (org) {
            syncUserToKeycloak({
                userId: user.id,
                email: user.email,
                name: user.name || undefined,
                password,
                emailVerified: !!user.emailVerified,
                orgId: org.id,
                orgSlug: org.slug,
                role: role as any,
            }).catch((error) => {
                console.error('Keycloak sync failed during invited signup:', error);
            });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.emailVerified,
            },
            org: {
                id: org?.id,
                name: org?.name,
                slug: org?.slug,
            },
            membership: {
                role: membership.role,
                status: membership.status,
            },
            message: 'Account created successfully! Please check your email to verify your account.',
        });

    } catch (error) {
        console.error('Invited signup error:', error);

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
