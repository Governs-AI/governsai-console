import 'server-only';
import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';
import {
  CONFIRMATION_TRANSITIONS,
  effectiveStatus,
  type ConfirmationEvent,
} from '@/lib/confirmation-lifecycle';
import { getSessionFromRequest } from '@/lib/auth-utils';
import { hashApiKey } from '@/lib/api-keys';

/**
 * Who is acting on a confirmation.
 *
 * - `session`: a signed-in dashboard user. May approve/deny when they raised
 *   the request or are OWNER/ADMIN of its org.
 * - `apiKey`: the integration that raised it. May read status and cancel,
 *   never approve — an agent must not be able to approve its own request.
 */
export type ConfirmationActor =
  | { kind: 'session'; userId: string }
  | { kind: 'apiKey'; userId: string; orgId: string; apiKeyId: string };

const APPROVER_ROLES = ['OWNER', 'ADMIN'];

export async function resolveConfirmationActor(
  request: NextRequest,
): Promise<ConfirmationActor | null> {
  const apiKey = request.headers.get('x-governs-key');
  if (apiKey) {
    const key = await prisma.aPIKey.findFirst({
      where: { keyHash: hashApiKey(apiKey), isActive: true },
      select: { id: true, userId: true, orgId: true },
    });
    return key ? { kind: 'apiKey', userId: key.userId, orgId: key.orgId, apiKeyId: key.id } : null;
  }

  const session = await getSessionFromRequest(request);
  return session ? { kind: 'session', userId: session.sub } : null;
}

/** Org role of `userId` in `orgId`, or null when they are not a member. */
async function roleIn(userId: string, orgId: string): Promise<string | null> {
  const membership = await prisma.orgMembership.findFirst({
    where: { userId, orgId },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function canView(
  actor: ConfirmationActor,
  confirmation: { userId: string; orgId: string },
): Promise<boolean> {
  if (actor.kind === 'apiKey') return actor.orgId === confirmation.orgId;
  if (actor.userId === confirmation.userId) return true;
  return (await roleIn(actor.userId, confirmation.orgId)) !== null;
}

export async function canDecide(
  actor: ConfirmationActor,
  confirmation: { userId: string; orgId: string },
): Promise<boolean> {
  if (actor.kind !== 'session') return false;
  const role = await roleIn(actor.userId, confirmation.orgId);
  if (!role) return false;
  return actor.userId === confirmation.userId || APPROVER_ROLES.includes(role);
}

export function canCancel(
  actor: ConfirmationActor,
  confirmation: { userId: string; orgId: string },
): Promise<boolean> | boolean {
  if (actor.kind === 'apiKey') return actor.orgId === confirmation.orgId;
  return canDecide(actor, confirmation);
}

/**
 * Apply one lifecycle event (see `lib/confirmation-lifecycle.ts`).
 *
 * The write is conditional on the row still being in the event's `from`
 * state, so two callers racing (approve vs deny, cancel vs approve, a double
 * consume) cannot both win and no terminal outcome is ever overwritten.
 * Returns false when the row was no longer in that state.
 */
/** Fields a transition may stamp alongside the new status. */
type TransitionData = {
  approvedAt?: Date;
  consumedAt?: Date;
  passkeyId?: string;
  confirmationToken?: string;
};

export async function transitionConfirmation(
  id: string,
  event: ConfirmationEvent,
  data: TransitionData = {},
): Promise<boolean> {
  const { from, to } = CONFIRMATION_TRANSITIONS[event];
  const updated = await prisma.pendingConfirmation.updateMany({
    where: { id, status: from },
    data: { ...data, status: to },
  });
  return updated.count > 0;
}

/**
 * Pending rows past their expiry read (and are stored) as expired. Rows in any
 * other state are returned untouched: an approval or denial outlives the
 * request's expiry.
 */
export async function expireIfStale<T extends { id: string; status: string; expiresAt: Date }>(
  confirmation: T,
): Promise<T> {
  if (effectiveStatus(confirmation) !== 'expired' || confirmation.status === 'expired') {
    return confirmation;
  }
  if (await transitionConfirmation(confirmation.id, 'expire')) {
    return { ...confirmation, status: 'expired' };
  }
  // Someone else moved it first; report what actually happened.
  const current = await prisma.pendingConfirmation.findUnique({
    where: { id: confirmation.id },
    select: { status: true },
  });
  return { ...confirmation, status: current?.status ?? 'expired' };
}

export function serializeConfirmation(c: {
  id: string;
  correlationId: string;
  userId: string;
  orgId: string;
  requestType: string;
  requestDesc: string;
  requestPayload: unknown;
  decision: string;
  reasons: unknown;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  approvedAt: Date | null;
  user?: { id: string; email: string; name: string | null } | null;
  org?: { id: string; name: string; slug: string } | null;
}) {
  return {
    id: c.id,
    correlationId: c.correlationId,
    userId: c.userId,
    orgId: c.orgId,
    requestType: c.requestType,
    requestDesc: c.requestDesc,
    requestPayload: c.requestPayload,
    decision: c.decision,
    reasons: c.reasons,
    status: c.status,
    expiresAt: c.expiresAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    approvedAt: c.approvedAt?.toISOString() || null,
    user: c.user ?? undefined,
    org: c.org ?? undefined,
  };
}
