/**
 * The approval (PendingConfirmation) lifecycle, written down in one place.
 *
 *             approve            consume
 *   pending ───────────▶ approved ───────▶ consumed
 *      │
 *      ├── deny ────▶ denied
 *      ├── cancel ──▶ cancelled
 *      └── expire ──▶ expired      (pending past expiresAt)
 *
 * Every write to `PendingConfirmation.status` goes through `CONFIRMATION_TRANSITIONS`
 * (server side: `transitionConfirmation` in `lib/confirmations.ts`), so a row can
 * only move along these arrows. Only `pending` rows ever expire; an approved,
 * denied or consumed row keeps its outcome after `expiresAt` passes.
 *
 * The status strings are a wire contract: the TypeScript SDK, Python SDK, MCP
 * server and chat example all switch on them. Add states here, never rename.
 *
 * Pure module (no Prisma, no `server-only`) so client pages can share the copy.
 */

/**
 * Passkey registration stores its WebAuthn challenge in the same table
 * (`requestType: 'passkey_registration'`) and runs its own, shorter machine:
 * pending → consumed when the passkey is saved. Those rows are not approval
 * requests: they never appear in the approvals inbox and cannot be decided.
 */
export const PASSKEY_REGISTRATION_REQUEST_TYPE = 'passkey_registration';

export const CONFIRMATION_STATUSES = [
  'pending',
  'approved',
  'denied',
  'expired',
  'cancelled',
  'consumed',
] as const;

export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];

export type ConfirmationEvent = 'approve' | 'deny' | 'cancel' | 'expire' | 'consume';

export const CONFIRMATION_TRANSITIONS: Record<
  ConfirmationEvent,
  { from: ConfirmationStatus; to: ConfirmationStatus }
> = {
  approve: { from: 'pending', to: 'approved' },
  deny: { from: 'pending', to: 'denied' },
  cancel: { from: 'pending', to: 'cancelled' },
  expire: { from: 'pending', to: 'expired' },
  consume: { from: 'approved', to: 'consumed' },
};

export function isConfirmationStatus(value: unknown): value is ConfirmationStatus {
  return typeof value === 'string' && (CONFIRMATION_STATUSES as readonly string[]).includes(value);
}

/** True when `event` is a legal move out of `status`. */
export function canTransition(status: string, event: ConfirmationEvent): boolean {
  return CONFIRMATION_TRANSITIONS[event].from === status;
}

/**
 * The status a reader should see right now: a pending row past its expiry is
 * expired even if nothing has written that to the database yet.
 */
export function effectiveStatus(
  confirmation: { status: string; expiresAt: Date | string },
  now: Date = new Date(),
): string {
  if (confirmation.status === 'pending' && new Date(confirmation.expiresAt) < now) {
    return 'expired';
  }
  return confirmation.status;
}

/** A person can still approve or deny it. */
export function isAwaitingDecision(
  confirmation: { status: string; expiresAt: Date | string },
  now: Date = new Date(),
): boolean {
  return effectiveStatus(confirmation, now) === 'pending';
}

type Tone = 'warning' | 'success' | 'destructive' | 'secondary';

/** Human copy for each state, shared by the confirm page and the approvals inbox. */
export const CONFIRMATION_STATUS_COPY: Record<
  ConfirmationStatus,
  { label: string; tone: Tone; summary: string }
> = {
  pending: {
    label: 'Pending',
    tone: 'warning',
    summary: 'Waiting for someone to approve or deny it.',
  },
  approved: {
    label: 'Approved',
    tone: 'success',
    summary: 'Approved. The requesting agent can now run it once.',
  },
  consumed: {
    label: 'Approved · used',
    tone: 'success',
    summary: 'Approved, and the agent has already run the approved action.',
  },
  denied: {
    label: 'Denied',
    tone: 'destructive',
    summary: 'Denied. The agent was told not to run it.',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'secondary',
    summary: 'Cancelled by the requesting agent before anyone decided.',
  },
  expired: {
    label: 'Expired',
    tone: 'secondary',
    summary: 'Expired before anyone decided. The agent has to ask again.',
  },
};

export function confirmationStatusCopy(status: string) {
  return isConfirmationStatus(status)
    ? CONFIRMATION_STATUS_COPY[status]
    : { label: status, tone: 'secondary' as Tone, summary: `Status: ${status}.` };
}
