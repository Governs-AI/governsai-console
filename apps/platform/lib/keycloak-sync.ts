import 'server-only';

import { prisma } from '@governs-ai/db';
import { syncUserToKeycloak, type SyncUserToKeycloakParams } from './keycloak-admin';
import crypto from 'crypto';

const DEFAULT_MAX_ATTEMPTS = 10;

function now() {
  return new Date();
}

function serializeError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ''}`;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function computeBackoffMs(attempts: number): number {
  // 30s, 60s, 120s, ... capped at 30m
  const base = 30_000;
  const cap = 30 * 60_000;
  const exp = Math.min(attempts, 10);
  return Math.min(base * 2 ** exp, cap);
}

function getPasswordEncryptionKey(): Buffer | null {
  const raw = process.env.KEYCLOAK_SYNC_PASSWORD_ENCRYPTION_KEY;
  if (!raw) return null;

  // Expect base64 32 bytes (AES-256)
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    console.warn(
      'KEYCLOAK_SYNC_PASSWORD_ENCRYPTION_KEY must be 32 bytes (base64). Password retries disabled.'
    );
    return null;
  }

  return key;
}

function encryptPassword(plaintext: string): Buffer | null {
  const key = getPasswordEncryptionKey();
  if (!key) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv (12) + tag (16) + ciphertext
  return Buffer.concat([iv, tag, ciphertext]);
}

function decryptPassword(payload: Buffer): string | null {
  const key = getPasswordEncryptionKey();
  if (!key) return null;
  if (payload.length < 12 + 16 + 1) return null;

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

function isPasswordRequiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('password not provided for creation');
}

export async function recordKeycloakSyncSuccess(userId: string): Promise<void> {
  await prisma.keycloakSyncState.upsert({
    where: { userId },
    create: {
      userId,
      status: 'HEALTHY',
      lastSyncedAt: now(),
      lastAttemptAt: now(),
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
    },
    update: {
      status: 'HEALTHY',
      lastSyncedAt: now(),
      lastAttemptAt: now(),
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
    },
  });
}

export async function recordKeycloakSyncFailure(params: {
  userId: string;
  error: unknown;
  nextRetryAt?: Date | null;
}): Promise<void> {
  const { userId, error, nextRetryAt } = params;

  await prisma.keycloakSyncState.upsert({
    where: { userId },
    create: {
      userId,
      status: 'DEGRADED',
      lastSyncedAt: null,
      lastAttemptAt: now(),
      retryCount: 1,
      nextRetryAt: nextRetryAt ?? null,
      lastError: serializeError(error),
    },
    update: {
      status: 'DEGRADED',
      lastAttemptAt: now(),
      retryCount: { increment: 1 },
      nextRetryAt: nextRetryAt ?? null,
      lastError: serializeError(error),
    },
  });
}

export async function enqueueKeycloakSyncJob(params: {
  userId: string;
  email: string;
  name?: string;
  orgId: string;
  orgSlug: string;
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
  emailVerified: boolean;
  password?: string;
  // If provided, encrypted password will only be kept for this long.
  passwordTtlMs?: number;
}): Promise<void> {
  const passwordTtlMs = params.passwordTtlMs ?? 15 * 60_000; // 15 minutes

  const encryptedPassword = params.password
    ? encryptPassword(params.password)
    : null;

  const passwordExpiresAt =
    encryptedPassword && params.password ? new Date(Date.now() + passwordTtlMs) : null;

  const existing = await prisma.keycloakSyncJob.findFirst({
    where: {
      userId: params.userId,
      orgId: params.orgId,
      status: { in: ['PENDING', 'FAILED'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    await prisma.keycloakSyncJob.update({
      where: { id: existing.id },
      data: {
        email: params.email,
        name: params.name ?? null,
        orgSlug: params.orgSlug,
        role: params.role,
        emailVerified: params.emailVerified,
        encryptedPassword: encryptedPassword ?? undefined,
        passwordExpiresAt: passwordExpiresAt ?? undefined,
        status: 'PENDING',
        nextRunAt: now(),
      },
    });
    await prisma.keycloakSyncState.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        status: 'DEGRADED',
        lastSyncedAt: null,
        lastAttemptAt: now(),
        retryCount: 0,
        nextRetryAt: now(),
        lastError: null,
      },
      update: {
        status: 'DEGRADED',
        nextRetryAt: now(),
      },
    });
    return;
  }

  await prisma.keycloakSyncJob.create({
    data: {
      userId: params.userId,
      email: params.email,
      name: params.name ?? null,
      orgId: params.orgId,
      orgSlug: params.orgSlug,
      role: params.role,
      emailVerified: params.emailVerified,
      encryptedPassword: encryptedPassword ?? undefined,
      passwordExpiresAt: passwordExpiresAt ?? undefined,
      status: 'PENDING',
      nextRunAt: now(),
    },
  });

  await prisma.keycloakSyncState.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      status: 'DEGRADED',
      lastSyncedAt: null,
      lastAttemptAt: now(),
      retryCount: 0,
      nextRetryAt: now(),
      lastError: null,
    },
    update: {
      status: 'DEGRADED',
      nextRetryAt: now(),
    },
  });
}

export async function processKeycloakSyncJobs(params?: { limit?: number }): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const limit = params?.limit ?? 25;
  const due = await prisma.keycloakSyncJob.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      nextRunAt: { lte: now() },
      attempts: { lt: DEFAULT_MAX_ATTEMPTS },
    },
    orderBy: { nextRunAt: 'asc' },
    take: limit,
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const job of due) {
    // Claim the job (best-effort; avoids concurrent workers double-processing)
    const claim = await prisma.keycloakSyncJob.updateMany({
      where: { id: job.id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'RUNNING', lastAttemptAt: now() },
    });

    if (claim.count === 0) continue;

    processed++;

    let password: string | undefined;
    if (job.encryptedPassword && job.passwordExpiresAt && job.passwordExpiresAt > now()) {
      const decrypted = decryptPassword(job.encryptedPassword);
      if (decrypted) password = decrypted;
    }

    const syncParams: SyncUserToKeycloakParams = {
      userId: job.userId,
      email: job.email,
      name: job.name ?? undefined,
      password,
      emailVerified: job.emailVerified,
      orgId: job.orgId,
      orgSlug: job.orgSlug,
      role: job.role,
    };

    const result = await syncUserToKeycloak(syncParams);

    if (result.success) {
      succeeded++;
      await prisma.$transaction([
        prisma.keycloakSyncJob.update({
          where: { id: job.id },
          data: { status: 'SUCCEEDED', lastError: null },
        }),
        prisma.keycloakSyncState.upsert({
          where: { userId: job.userId },
          create: {
            userId: job.userId,
            status: 'HEALTHY',
            lastSyncedAt: now(),
            lastAttemptAt: now(),
            retryCount: 0,
            nextRetryAt: null,
            lastError: null,
          },
          update: {
            status: 'HEALTHY',
            lastSyncedAt: now(),
            lastAttemptAt: now(),
            retryCount: 0,
            nextRetryAt: null,
            lastError: null,
          },
        }),
      ]);
      continue;
    }

    failed++;

    const err = result.error ?? new Error('Keycloak sync failed');
    const requiresPassword = isPasswordRequiredError(err);

    const nextRunAt = requiresPassword
      ? null
      : new Date(Date.now() + computeBackoffMs(job.attempts));

    await prisma.$transaction([
      prisma.keycloakSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          lastError: serializeError(err),
          nextRunAt: nextRunAt ?? new Date('9999-12-31T00:00:00.000Z'),
        },
      }),
      prisma.keycloakSyncState.upsert({
        where: { userId: job.userId },
        create: {
          userId: job.userId,
          status: 'DEGRADED',
          lastSyncedAt: null,
          lastAttemptAt: now(),
          retryCount: 1,
          nextRetryAt: nextRunAt,
          lastError: serializeError(err),
        },
        update: {
          status: 'DEGRADED',
          lastAttemptAt: now(),
          retryCount: { increment: 1 },
          nextRetryAt: nextRunAt,
          lastError: serializeError(err),
        },
      }),
    ]);
  }

  return { processed, succeeded, failed };
}
