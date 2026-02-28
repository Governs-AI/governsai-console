/**
 * TEST-3.7c — Console API: Budget context route integration tests.
 *
 * Covers:
 *  - GET /api/v1/budget/context
 *  - Missing API key  → 401
 *  - Invalid/inactive key → 401
 *  - Valid key, no budget → returns zeros
 *  - User-level budget → scoped to userId
 *  - Org-level budget  → scoped to orgId only
 *  - Remaining budget correctly clamped to 0 when overspent
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';
import { GET } from '@/app/api/v1/budget/context/route';

const mockPrisma = prisma as any;

function makeReq(apiKey?: string) {
  return new NextRequest('http://localhost/api/v1/budget/context', {
    method: 'GET',
    headers: apiKey ? { 'X-Governs-Key': apiKey } : {},
  });
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe('authentication', () => {
  it('returns 401 when X-Governs-Key header is absent', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 when key is inactive', async () => {
    mockPrisma.aPIKey.findUnique.mockResolvedValue({ isActive: false, user: {}, org: {} });
    const res = await GET(makeReq('gai_bad'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when key is not found in DB', async () => {
    mockPrisma.aPIKey.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq('gai_unknown'));
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Budget resolution — no budget configured
// ---------------------------------------------------------------------------

describe('no budget configured', () => {
  beforeEach(() => {
    mockPrisma.aPIKey.findUnique.mockResolvedValue({
      isActive: true,
      user: { id: 'u1' },
      org: { id: 'org-1' },
    });
    mockPrisma.budgetLimit.findFirst.mockResolvedValue(null);
    mockPrisma.usageRecord.aggregate.mockResolvedValue({ _sum: { cost: null } });
    mockPrisma.purchaseRecord.aggregate.mockResolvedValue({ _sum: { amount: null } });
  });

  it('returns zeros when no budget or spend exists', async () => {
    const res = await GET(makeReq('gai_valid'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_limit).toBe(0);
    expect(body.current_spend).toBe(0);
    expect(body.llm_spend).toBe(0);
    expect(body.purchase_spend).toBe(0);
    expect(body.remaining_budget).toBe(0);
  });

  it('response includes budget_type field', async () => {
    const res = await GET(makeReq('gai_valid'));
    const body = await res.json();
    expect(body).toHaveProperty('budget_type');
  });
});

// ---------------------------------------------------------------------------
// User-level budget
// ---------------------------------------------------------------------------

describe('user-level budget', () => {
  beforeEach(() => {
    mockPrisma.aPIKey.findUnique.mockResolvedValue({
      isActive: true,
      user: { id: 'u1' },
      org: { id: 'org-1' },
    });
    // User budget takes precedence over org budget
    mockPrisma.budgetLimit.findFirst
      .mockResolvedValueOnce({ monthlyLimit: 50 })   // user budget found
      .mockResolvedValueOnce(null);                  // org budget (not checked if user exists)
    mockPrisma.usageRecord.aggregate.mockResolvedValue({ _sum: { cost: 10 } });
    mockPrisma.purchaseRecord.aggregate.mockResolvedValue({ _sum: { amount: 5 } });
  });

  it('budget_type is user', async () => {
    const res = await GET(makeReq('gai_valid'));
    const body = await res.json();
    expect(body.budget_type).toBe('user');
  });

  it('computes remaining correctly', async () => {
    const res = await GET(makeReq('gai_valid'));
    const body = await res.json();
    expect(body.monthly_limit).toBe(50);
    expect(body.llm_spend).toBe(10);
    expect(body.purchase_spend).toBe(5);
    expect(body.current_spend).toBe(15);
    expect(body.remaining_budget).toBeCloseTo(35);
  });
});

// ---------------------------------------------------------------------------
// Org-level budget
// ---------------------------------------------------------------------------

describe('org-level budget', () => {
  beforeEach(() => {
    mockPrisma.aPIKey.findUnique.mockResolvedValue({
      isActive: true,
      user: { id: 'u1' },
      org: { id: 'org-1' },
    });
    // No user-level budget → falls back to org budget
    mockPrisma.budgetLimit.findFirst
      .mockResolvedValueOnce(null)                        // no user budget
      .mockResolvedValueOnce({ monthlyLimit: 100 });      // org budget
    mockPrisma.usageRecord.aggregate.mockResolvedValue({ _sum: { cost: 30 } });
    mockPrisma.purchaseRecord.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
  });

  it('budget_type is organization', async () => {
    const res = await GET(makeReq('gai_valid'));
    const body = await res.json();
    expect(body.budget_type).toBe('organization');
  });

  it('remaining is clamped to 0 when spend exceeds limit', async () => {
    // Override: spend > limit
    mockPrisma.usageRecord.aggregate.mockResolvedValue({ _sum: { cost: 110 } });
    const res = await GET(makeReq('gai_valid'));
    const body = await res.json();
    expect(body.remaining_budget).toBe(0);
  });
});
