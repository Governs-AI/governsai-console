import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    createUser,
    addUserToOrganization,
    createEmailVerificationToken
} from '@/lib/auth';
import { prisma } from '@governs-ai/db';
import { syncUserToKeycloak } from '@/lib/keycloak-admin';
import {
    enqueueKeycloakSyncJob,
    recordKeycloakSyncFailure,
    recordKeycloakSyncSuccess,
} from '@/lib/keycloak-sync';

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

        // Validate invitation token first (do not consume yet)
        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token: inviteToken },
        });

        if (!verificationToken || verificationToken.purpose !== 'invite') {
            return NextResponse.json(
                { error: 'Invalid or expired invitation token' },
                { status: 400 }
            );
        }

        if (verificationToken.expiresAt < new Date()) {
            await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
            return NextResponse.json(
                { error: 'Invalid or expired invitation token' },
                { status: 400 }
            );
        }

        const { email: invitedEmail, orgId, role } = verificationToken;

        if (!orgId || !role) {
            return NextResponse.json(
                { error: 'Invalid invitation token' },
                { status: 400 }
            );
        }

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
                { error: 'User already exists. Please log in instead.', requiresLogin: true },
                { status: 409 }
            );
        }

        // Create user
        const user = await createUser(email, password, name);

        // Add user to organization immediately
        const membership = await addUserToOrganization(user.id, orgId, role as any);
        await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

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
            })
                .then(async (result) => {
                    if (result.success) {
                        await recordKeycloakSyncSuccess(user.id);
                    } else {
                        await recordKeycloakSyncFailure({ userId: user.id, error: result.error });
                        await enqueueKeycloakSyncJob({
                            userId: user.id,
                            email: user.email,
                            name: user.name || undefined,
                            orgId: org.id,
                            orgSlug: org.slug,
                            role: role as any,
                            emailVerified: !!user.emailVerified,
                            password,
                            passwordTtlMs: 15 * 60_000,
                        });
                    }
                })
                .catch(async (error) => {
                    console.error('Keycloak sync failed during invited signup:', error);
                    await recordKeycloakSyncFailure({ userId: user.id, error });
                    await enqueueKeycloakSyncJob({
                        userId: user.id,
                        email: user.email,
                        name: user.name || undefined,
                        orgId: org.id,
                        orgSlug: org.slug,
                        role: role as any,
                        emailVerified: !!user.emailVerified,
                        password,
                        passwordTtlMs: 15 * 60_000,
                    });
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
            },
            message: 'Account created successfully! Please check your email to verify your account.',
        });

    } catch (error) {
        console.error('Invited signup error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
