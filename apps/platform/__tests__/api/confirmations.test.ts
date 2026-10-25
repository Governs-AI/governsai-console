/**
 * V2.4 — approvals: who may read, decide, cancel and consume a confirmation.
 *
 *  - an API key reads its own org's confirmations, never approves
 *  - the requester or an org OWNER/ADMIN approves/denies with a session
 *  - a decided confirmation cannot be decided again (409)
 *  - consume flips approved → consumed exactly once
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/auth-utils', () => ({
  getSessionFromRequest: jest.fn(),
}));

import { getSessionFromRequest } from '@/lib/auth-utils';
import { GET } from '@/app/api/v1/confirmation/[correlationId]/route';
import { POST as APPROVE } from '@/app/api/v1/confirmation/[correlationId]/approve/route';
import { POST as DENY } from '@/app/api/v1/confirmation/[correlationId]/deny/route';
import { POST as CONSUME } from '@/app/api/v1/confirmation/[correlationId]/consume/route';
import { POST as CANCEL } from '@/app/api/v1/confirmation/cancel/route';

const mockSession = getSessionFromRequest as jest.Mock;
const mockPrisma = prisma as any;

const ROW = {
  id: 'pc-1',
  correlationId: 'corr-1',
  userId: 'requester',
  orgId: 'org-1',
  apiKeyId: 'key-1',
  requestType: 'tool_call',
  requestDesc: 'Execute tool: payment_process',
  requestPayload: { tool: 'payment_process' },
  decision: 'confirm',
  reasons: ['tool-specific.confirm'],
  status: 'pending',
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  approvedAt: null,
};

const params = { params: Promise.resolve({ correlationId: 'corr-1' }) };

function req(headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest('http://localhost/api/v1/confirmation/corr-1', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function asSession(userId: string, role: string | null) {
  mockSession.mockResolvedValue({ sub: userId, orgId: 'org-1', roles: [] });
  mockPrisma.orgMembership.findFirst.mockResolvedValue(role ? { role } : null);
}

function asKey(orgId = 'org-1') {
  mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'key-1', userId: 'requester', orgId });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue(null);
  mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({ ...ROW });
  mockPrisma.pendingConfirmation.findUniqueOrThrow.mockResolvedValue({ ...ROW, status: 'approved' });
  mockPrisma.pendingConfirmation.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.auditLog.create.mockResolvedValue({});
});

describe('GET /confirmation/:id', () => {
  it('lets the same-org API key poll status', async () => {
    asKey();
    const res = await GET(req({ 'x-governs-key': 'gai_x' }), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confirmation.status).toBe('pending');
    expect(body.confirmation.canDecide).toBe(false);
  });

  it('hides another org’s confirmation from a key', async () => {
    asKey('org-2');
    const res = await GET(req({ 'x-governs-key': 'gai_x' }), params);
    expect(res.status).toBe(403);
  });

  it('rejects anonymous callers', async () => {
    const res = await GET(req(), params);
    expect(res.status).toBe(401);
  });
});

describe('POST /confirmation/:id/approve', () => {
  it('never lets an API key approve', async () => {
    asKey();
    const res = await APPROVE(req({ 'x-governs-key': 'gai_x' }), params);
    expect(res.status).toBe(401);
    expect(mockPrisma.pendingConfirmation.updateMany).not.toHaveBeenCalled();
  });

  it('lets an org admin approve and audit-logs it', async () => {
    asSession('admin-user', 'ADMIN');
    const res = await APPROVE(req({}, {}), params);
    expect(res.status).toBe(200);
    expect(mockPrisma.pendingConfirmation.updateMany).toHaveBeenCalledWith({
      where: { id: 'pc-1', status: 'pending' },
      data: expect.objectContaining({ status: 'approved' }),
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'confirmation.approve', userId: 'admin-user' }),
    });
  });

  it('lets the requester approve their own request', async () => {
    asSession('requester', 'DEVELOPER');
    const res = await APPROVE(req({}, {}), params);
    expect(res.status).toBe(200);
  });

  it('forbids a non-admin member who did not raise it', async () => {
    asSession('someone-else', 'DEVELOPER');
    const res = await APPROVE(req({}, {}), params);
    expect(res.status).toBe(403);
  });

  it('forbids users outside the org', async () => {
    asSession('outsider', null);
    const res = await APPROVE(req({}, {}), params);
    expect(res.status).toBe(403);
  });

  it('returns 409 once already decided', async () => {
    asSession('admin-user', 'OWNER');
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({ ...ROW, status: 'denied' });
    const res = await APPROVE(req({}, {}), params);
    expect(res.status).toBe(409);
  });

  it('returns 409 when it lost a concurrent decision', async () => {
    asSession('admin-user', 'OWNER');
    mockPrisma.pendingConfirmation.updateMany.mockResolvedValue({ count: 0 });
    const res = await APPROVE(req({}, {}), params);
    expect(res.status).toBe(409);
  });

  it('treats an expired pending request as expired', async () => {
    asSession('admin-user', 'OWNER');
    mockPrisma.pendingConfirmation.findUnique.mockResolvedValue({
      ...ROW,
      expiresAt: new Date(Date.now() - 1000),
    });
    mockPrisma.pendingConfirmation.update.mockResolvedValue({});
    const res = await APPROVE(req({}, {}), params);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/expired/);
  });
});

describe('POST /confirmation/:id/deny', () => {
  it('records a denial', async () => {
    asSession('admin-user', 'ADMIN');
    const res = await DENY(req({}, {}), params);
    expect(res.status).toBe(200);
    expect(mockPrisma.pendingConfirmation.updateMany).toHaveBeenCalledWith({
      where: { id: 'pc-1', status: 'pending' },
      data: { status: 'denied' },
    });
  });
});

describe('POST /confirmation/:id/consume', () => {
  it('consumes an approved confirmation for the same-org key', async () => {
    asKey();
    const res = await CONSUME(req({ 'x-governs-key': 'gai_x' }), params);
    expect(res.status).toBe(200);
    expect(mockPrisma.pendingConfirmation.updateMany).toHaveBeenCalledWith({
      where: { id: 'pc-1', status: 'approved' },
      data: expect.objectContaining({ status: 'consumed' }),
    });
  });

  it('refuses a second consume and says why', async () => {
    asKey();
    mockPrisma.pendingConfirmation.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.pendingConfirmation.findUnique
      .mockResolvedValueOnce({ ...ROW, status: 'approved' })
      .mockResolvedValueOnce({ status: 'consumed' });
    const res = await CONSUME(req({ 'x-governs-key': 'gai_x' }), params);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Approval was already used', status: 'consumed' });
  });

  it('requires an API key', async () => {
    asSession('admin-user', 'OWNER');
    const res = await CONSUME(req({}, {}), params);
    expect(res.status).toBe(401);
  });
});

describe('POST /confirmation/cancel', () => {
  it('rejects anonymous cancellation', async () => {
    const res = await CANCEL(req({}, { correlationId: 'corr-1' }));
    expect(res.status).toBe(401);
  });

  it('rejects a key from another org', async () => {
    asKey('org-2');
    const res = await CANCEL(req({ 'x-governs-key': 'gai_x' }, { correlationId: 'corr-1' }));
    expect(res.status).toBe(403);
  });
});
