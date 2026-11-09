/**
 * The approval lifecycle (lib/confirmation-lifecycle.ts) and the guarantees the
 * routes get from routing every status write through it:
 *
 *  - only `pending` rows expire; an approved/denied/consumed outcome is never
 *    rewritten to `expired` once `expiresAt` passes
 *  - every write is conditional on the `from` state, so racing callers
 *    (cancel vs approve, passkey approve vs deny) cannot both win
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/auth-utils', () => ({
  getSessionFromRequest: jest.fn(),
}));

import {
  CONFIRMATION_STATUSES,
  CONFIRMATION_STATUS_COPY,
  CONFIRMATION_TRANSITIONS,
  canTransition,
  effectiveStatus,
  isAwaitingDecision,
  isConfirmationStatus,
} from '@/lib/confirmation-lifecycle';
import { getSessionFromRequest } from '@/lib/auth-utils';
import { expireIfStale, transitionConfirmation } from '@/lib/confirmations';
import { POST as APPROVE } from '@/app/api/v1/confirmation/[correlationId]/approve/route';
import { POST as AUTH_CHALLENGE } from '@/app/api/v1/confirmation/auth-challenge/route';
import { POST as CANCEL } from '@/app/api/v1/confirmation/cancel/route';

const mockPrisma = prisma as any;

const PAST = () => new Date(Date.now() - 60_000);
const FUTURE = () => new Date(Date.now() + 60_000);

const ROW = {
  id: 'pc-1',
  correlationId: 'corr-1',
  userId: 'requester',
  orgId: 'org-1',
  apiKeyId: 'key-1',
  requestType: 'tool_call',
  status: 'pending',
  expiresAt: FUTURE(),
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/v1/confirmation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.pendingConfirmation.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.auditLog.create.mockResolvedValue({});
});

describe('lifecycle table', () => {
  it('only lets pending rows be approved, denied, cancelled or expired', () => {
    for (const event of ['approve', 'deny', 'cancel', 'expire'] as const) {
      expect(CONFIRMATION_TRANSITIONS[event].from).toBe('pending');
    }
    expect(CONFIRMATION_TRANSITIONS.consume).toEqual({ from: 'approved', to: 'consumed' });
  });

  it('has no way out of denied, cancelled, expired or consumed', () => {
    for (const status of ['denied', 'cancelled', 'expired', 'consumed']) {
      for (const event of Object.keys(CONFIRMATION_TRANSITIONS) as Array<
        keyof typeof CONFIRMATION_TRANSITIONS
      >) {
        expect(canTransition(status, event)).toBe(false);
      }
    }
  });

  it('keeps the wire status strings the SDKs switch on', () => {
    expect([...CONFIRMATION_STATUSES]).toEqual([
      'pending', 'approved', 'denied', 'expired', 'cancelled', 'consumed',
    ]);
    expect(isConfirmationStatus('rejected')).toBe(false);
    expect(isConfirmationStatus(null)).toBe(false);
  });

  it('has human copy for every status', () => {
    for (const status of CONFIRMATION_STATUSES) {
      expect(CONFIRMATION_STATUS_COPY[status].label).toBeTruthy();
      expect(CONFIRMATION_STATUS_COPY[status].summary).toBeTruthy();
    }
  });

  it('reads a stale pending row as expired, but never a decided one', () => {
    expect(effectiveStatus({ status: 'pending', expiresAt: PAST() })).toBe('expired');
    expect(effectiveStatus({ status: 'approved', expiresAt: PAST() })).toBe('approved');
    expect(effectiveStatus({ status: 'consumed', expiresAt: PAST() })).toBe('consumed');
    expect(isAwaitingDecision({ status: 'pending', expiresAt: FUTURE() })).toBe(true);
    expect(isAwaitingDecision({ status: 'pending', expiresAt: PAST() })).toBe(false);
  });
});

describe('transitionConfirmation', () => {
  it('writes conditionally on the from-state', async () => {
    await transitionConfirmation('pc-1', 'consume', { consumedAt: new Date(0) });
    expect(mockPrisma.pendingConfirmation.updateMany).toHaveBeenCalledWith({
      where: { id: 'pc-1', status: 'approved' },
      data: { consumedAt: new Date(0), status: 'consumed' },
    });
  });

  it('reports a lost race', async () => {
    mockPrisma.pendingConfirmation.updateMany.mockResolvedValue({ count: 0 });
    expect(await transitionConfirmation('pc-1', 'approve')).toBe(false);
  });
});

describe('expireIfStale', () => {
  it('expires a stale pending row conditionally', async () => {
    const out = await expireIfStale({ ...ROW, expiresAt: PAST() });
    expect(out.status).toBe('expired');
    expect(mockPrisma.pendingConfirmation.updateMany).toHaveBeenCalledWith({
      where: { id: 'pc-1', status: 'pending' },
      data: { status: 'expired' },
    });
    expect(mockPrisma.pendingConfirmation.update).not.toHaveBeenCalled();
  });

  it('leaves an approved row alone after expiry', async () => {
    const out = await expireIfStale({ ...ROW, status: 'approved', expiresAt: PAST() });
    expect(out.status).toBe('approved');
    expect(mockPrisma.pendingConfirmation.updateMany).not.toHaveBeenCalled();
  });

  it('reports what actually happened when someone else moved it first', async () => {
    mockPrisma.pendingConfirmation.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({ status: 'denied' });
    const out = await expireIfStale({ ...ROW, expiresAt: PAST() });
    expect(out.status).toBe('denied');
  });
});

describe('POST /confirmation/auth-challenge', () => {
  it('does not rewrite a consumed approval as expired', async () => {
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({
      ...ROW,
      status: 'consumed',
      expiresAt: PAST(),
    });
    const res = await AUTH_CHALLENGE(post({ correlationId: 'corr-1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Confirmation already consumed');
    expect(mockPrisma.pendingConfirmation.update).not.toHaveBeenCalled();
    expect(mockPrisma.pendingConfirmation.updateMany).not.toHaveBeenCalled();
  });

  it('still answers 410 for a stale pending request', async () => {
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({ ...ROW, expiresAt: PAST() });
    const res = await AUTH_CHALLENGE(post({ correlationId: 'corr-1' }));
    expect(res.status).toBe(410);
  });
});

describe('POST /confirmation/:id/approve on a passkey-registration challenge', () => {
  it('is not an approval request, so it cannot be decided', async () => {
    (getSessionFromRequest as jest.Mock).mockResolvedValue({ sub: 'requester', orgId: 'org-1', roles: [] });
    mockPrisma.orgMembership.findFirst.mockResolvedValue({ role: 'OWNER' });
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({
      ...ROW,
      requestType: 'passkey_registration',
    });
    const res = await APPROVE(post({}), { params: Promise.resolve({ correlationId: 'corr-1' }) });
    expect(res.status).toBe(404);
    expect(mockPrisma.pendingConfirmation.updateMany).not.toHaveBeenCalled();
  });
});

describe('POST /confirmation/cancel', () => {
  beforeEach(() => {
    mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'key-1', userId: 'requester', orgId: 'org-1' });
  });

  it('cancels a pending request conditionally', async () => {
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({ ...ROW });
    const res = await CANCEL(post({ correlationId: 'corr-1' }, { 'x-governs-key': 'gai_x' }));
    expect(res.status).toBe(200);
    expect(mockPrisma.pendingConfirmation.updateMany).toHaveBeenCalledWith({
      where: { id: 'pc-1', status: 'pending' },
      data: { status: 'cancelled' },
    });
  });

  it('does not overwrite an approval that landed first', async () => {
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({ ...ROW });
    mockPrisma.pendingConfirmation.updateMany.mockResolvedValue({ count: 0 });
    const res = await CANCEL(post({ correlationId: 'corr-1' }, { 'x-governs-key': 'gai_x' }));
    expect(res.status).toBe(409);
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('reports a stale pending request as expired rather than cancelling it', async () => {
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({ ...ROW, expiresAt: PAST() });
    const res = await CANCEL(post({ correlationId: 'corr-1' }, { 'x-governs-key': 'gai_x' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Confirmation already expired');
  });
});
