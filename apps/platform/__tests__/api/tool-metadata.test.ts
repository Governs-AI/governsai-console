/**
 * V2.5 — GET /api/v1/tools/:toolName/metadata (what the SDKs call) and the
 * built-in tool catalog that keeps a fresh install's policy editor usable.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/session', () => ({ getRequestContext: jest.fn() }));

import { getRequestContext } from '@/lib/session';
import { GET } from '@/app/api/v1/tools/[id]/metadata/route';
import { BUILT_IN_TOOLS } from '@/lib/tool-catalog';

const mockPrisma = prisma as any;
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/v1/tools/x/metadata', { headers });

const PAYMENT = {
  id: 't1',
  toolName: 'payment_process',
  scope: 'net.external',
  direction: 'ingress',
  category: 'financial',
  riskLevel: 'critical',
  requiresApproval: true,
  metadata: { vendor: 'stripe' },
  isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.toolConfig.findMany.mockResolvedValue([]);
  mockPrisma.toolConfig.createMany.mockResolvedValue({ count: BUILT_IN_TOOLS.length });
});

it('requires a key or session', async () => {
  (getRequestContext as jest.Mock).mockResolvedValue(null);
  const res = await GET(req(), params('payment_process'));
  expect(res.status).toBe(401);
});

it('returns the tool_config shape precheck expects', async () => {
  mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k' });
  mockPrisma.toolConfig.findUnique.mockResolvedValueOnce(PAYMENT);
  const res = await GET(req({ 'x-governs-key': 'gai_x' }), params('payment_process'));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    metadata: {
      tool_name: 'payment_process',
      scope: 'net.external',
      direction: 'ingress',
      metadata: {
        vendor: 'stripe',
        category: 'financial',
        risk_level: 'critical',
        requires_approval: true,
      },
    },
  });
});

it('404s unknown tools', async () => {
  mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k' });
  mockPrisma.toolConfig.findUnique.mockResolvedValue(null);
  const res = await GET(req({ 'x-governs-key': 'gai_x' }), params('nope'));
  expect(res.status).toBe(404);
});

it('seeds missing built-in tools once, without overwriting existing rows', async () => {
  jest.resetModules();
  const { GET: freshGET } = require('@/app/api/v1/tools/[id]/metadata/route');
  const { prisma: freshPrisma } = require('@governs-ai/db');
  freshPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k' });
  freshPrisma.toolConfig.findMany.mockResolvedValue([{ toolName: 'payment_process' }]);
  freshPrisma.toolConfig.createMany.mockResolvedValue({ count: 1 });
  freshPrisma.toolConfig.findUnique.mockResolvedValue(PAYMENT);

  await freshGET(req({ 'x-governs-key': 'gai_x' }), params('payment_process'));
  await freshGET(req({ 'x-governs-key': 'gai_x' }), params('payment_process'));

  expect(freshPrisma.toolConfig.createMany).toHaveBeenCalledTimes(1);
  const { data, skipDuplicates } = freshPrisma.toolConfig.createMany.mock.calls[0][0];
  expect(skipDuplicates).toBe(true);
  const names = data.map((t: { toolName: string }) => t.toolName);
  expect(names).not.toContain('payment_process'); // already present
  expect(names).toEqual(expect.arrayContaining(['model.chat', 'email_send', 'bash.exec']));
  expect(names).toHaveLength(BUILT_IN_TOOLS.length - 1);
});
