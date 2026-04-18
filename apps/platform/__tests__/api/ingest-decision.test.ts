/**
 * QA.1 — POST /api/v1/ingest/decision route contract tests.
 *
 * The ingest endpoint accepts decision events emitted by precheck/postcheck.
 * It uses HMAC-SHA256 signatures over the raw body, keyed by
 * `process.env.GOVERNS_WEBHOOK_SECRET`.
 *
 * Covered contracts:
 *   * Missing signature             → 401
 *   * Wrong signature               → 401
 *   * Valid signature + bad payload → 400 (missing required field)
 *   * Valid signature + good payload → 202 accepted
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

const SECRET = 'ingest-test-secret';

// The route reads GOVERNS_WEBHOOK_SECRET at request time, not at import time,
// so we can set it here before the import.
process.env.GOVERNS_WEBHOOK_SECRET = SECRET;

import { POST, GET } from '@/app/api/v1/ingest/decision/route';

const mockPrisma = prisma as any;

function sign(body: string, secret = SECRET) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

function makeReq(body: string, signature?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature !== null) {
    headers['X-Governs-Signature'] = signature ?? sign(body);
  }
  return new NextRequest('http://localhost/api/v1/ingest/decision', {
    method: 'POST',
    body,
    headers,
  });
}

const VALID_EVENT = {
  userId: 'org-1:user-1',
  tool: 'model.chat',
  scope: 'net.external',
  decision: 'allow' as const,
  policyId: 'default-allow',
  reasons: [],
  payloadHash: 'sha256:deadbeef',
  latencyMs: 42,
  timestamp: Math.floor(Date.now() / 1000),
  correlationId: 'corr-abc',
  tags: [],
  direction: 'precheck' as const,
};

describe('POST /api/v1/ingest/decision', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when X-Governs-Signature header is missing', async () => {
    const body = JSON.stringify(VALID_EVENT);
    const res = await POST(makeReq(body, null));
    expect(res.status).toBe(401);
  });

  it('returns 401 when signature does not match body', async () => {
    const body = JSON.stringify(VALID_EVENT);
    const badSig = 'sha256=' + 'a'.repeat(64);
    const res = await POST(makeReq(body, badSig));
    expect(res.status).toBe(401);
  });

  it('returns 401 when body is tampered after signing', async () => {
    const body = JSON.stringify(VALID_EVENT);
    const sig = sign(body);
    const tamperedBody = body.replace('allow', 'deny');
    const res = await POST(makeReq(tamperedBody, sig));
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const incomplete = { ...VALID_EVENT, userId: undefined };
    const body = JSON.stringify(incomplete);
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(400);
  });

  it('returns 202 and persists decision on valid event', async () => {
    mockPrisma.decision.create.mockResolvedValue({ id: 'dec-1' });
    const body = JSON.stringify(VALID_EVENT);
    const res = await POST(makeReq(body, sign(body)));
    expect(res.status).toBe(202);

    expect(mockPrisma.decision.create).toHaveBeenCalledTimes(1);
    const callArgs = mockPrisma.decision.create.mock.calls[0][0];
    expect(callArgs.data).toMatchObject({
      orgId: 'org-1',
      direction: 'precheck',
      decision: 'allow',
      tool: 'model.chat',
      correlationId: 'corr-abc',
    });
  });
});

describe('GET /api/v1/ingest/decision (health)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 when database is reachable', async () => {
    (mockPrisma.$queryRaw as jest.Mock | undefined) = jest.fn().mockResolvedValue([1]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  it('returns 503 when database check fails', async () => {
    (mockPrisma.$queryRaw as jest.Mock) = jest.fn().mockRejectedValue(new Error('db down'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
