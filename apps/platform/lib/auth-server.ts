import 'server-only';

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { prisma } from '@governs-ai/db';
import { randomBytes } from 'crypto';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.PASSWORD_PEPPER) {
  throw new Error('PASSWORD_PEPPER environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER;

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  image: string | null;
}

export interface SessionData {
  sub: string; // userId
  orgId: string;
  roles: string[];
  iat: number;
  exp: number;
}

// Password hashing with optional server-side pepper
export async function hashPassword(password: string): Promise<string> {
  const pepperedPassword = PASSWORD_PEPPER ? password + PASSWORD_PEPPER : password;
  return argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const pepperedPassword = PASSWORD_PEPPER ? password + PASSWORD_PEPPER : password;
  return argon2.verify(hash, pepperedPassword);
}

// JWT token management
export function createSessionToken(userId: string, orgId: string, roles: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: userId,
      orgId,
      roles,
      iat: now,
      exp: now + 2 * 60 * 60, // 2 hours
    },
    JWT_SECRET
  );
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionData;
  } catch {
    return null;
  }
}

// Email verification tokens
export function createVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createEmailVerificationToken(
  email: string,
  purpose: 'email-verify' | 'invite',
  orgId?: string,
  role?: string
): Promise<string> {
  const token = createVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.create({
    data: {
      email: email.toLowerCase(),
      token,
      purpose,
      orgId,
      role: role as any,
      expiresAt,
    },
  });

  return token;
}

export async function consumeVerificationToken(
  token: string,
  purpose: 'email-verify' | 'invite'
): Promise<{
  email: string;
  orgId?: string;
  role?: string;
} | null> {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken || verificationToken.purpose !== purpose) {
    return null;
  }

  if (verificationToken.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
    return null;
  }

  // Delete the token after consumption
  await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

  return {
    email: verificationToken.email,
    orgId: verificationToken.orgId || undefined,
    role: verificationToken.role || undefined,
  };
}

// Password reset tokens
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = createVerificationToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await prisma.credential.update({
    where: { userId },
    data: {
      resetToken: token,
      resetTokenExp: expiresAt,
    },
  });

  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const credential = await prisma.credential.findUnique({
    where: { resetToken: token },
    include: { user: true },
  });

  if (!credential || !credential.resetTokenExp || credential.resetTokenExp < new Date()) {
    return null;
  }

  return credential.userId;
}

export async function clearPasswordResetToken(userId: string): Promise<void> {
  await prisma.credential.update({
    where: { userId },
    data: {
      resetToken: null,
      resetTokenExp: null,
    },
  });
}

// TOTP MFA
export function generateTotpSecret(): { secret: string; qrCodeUrl: string } {
  const secret = speakeasy.generateSecret({
    name: 'GovernsAI',
    issuer: 'GovernsAI',
    length: 32,
  });

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url!,
  };
}

export function verifyTotpToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Allow 1 time step (30 seconds) of drift
  });
}

// User management
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<AuthUser> {
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      credential: {
        create: {
          passwordHash: hashedPassword,
        },
      },
    },
  });

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    image: user.image,
  };
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    image: user.image,
  };
}

export async function verifyUserPassword(email: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { credential: true },
  });

  if (!user || !user.credential) return null;

  const isValid = await verifyPassword(password, user.credential.passwordHash);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    image: user.image,
  };
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const hashedPassword = await hashPassword(newPassword);

  await prisma.credential.upsert({
    where: { userId },
    create: {
      userId,
      passwordHash: hashedPassword,
    },
    update: {
      passwordHash: hashedPassword,
      passwordSetAt: new Date(),
    },
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}

// Organization management
export async function createOrganization(name: string, slug: string, ownerId: string) {
  return prisma.org.create({
    data: {
      name,
      slug,
      memberships: {
        create: {
          userId: ownerId,
          role: 'OWNER',
        },
      },
    },
  });
}

export async function getUserOrganizations(userId: string) {
  return prisma.orgMembership.findMany({
    where: { userId },
    include: { org: true },
  });
}

export async function addUserToOrganization(
  userId: string,
  orgId: string,
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER' = 'VIEWER'
) {
  return prisma.orgMembership.create({
    data: {
      userId,
      orgId,
      role,
    },
  });
}

export function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// MFA functions
export async function enableTotpMfa(userId: string): Promise<void> {
  await prisma.mfaTotp.update({
    where: { userId },
    data: { enabled: true },
  });
}

export async function disableTotpMfa(userId: string): Promise<void> {
  await prisma.mfaTotp.update({
    where: { userId },
    data: { enabled: false },
  });
}

// Password reset function
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return false;
  }

  const hashedPassword = await hashPassword(newPassword);
  await updateUserPassword(userId, hashedPassword);
  await clearPasswordResetToken(userId);
  
  return true;
}
