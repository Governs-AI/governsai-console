/**
 * DL-2 — syncKeyToPrecheck must pass org_id into the precheck api_keys row.
 */

// KEY_HMAC_SECRET must be set before the module is imported — the function checks it
// at call time (not import time), but the test also needs to exercise the unset path.
process.env.KEY_HMAC_SECRET = 'test-hmac-secret';

import { prisma } from '@governs-ai/db';
import { syncKeyToPrecheck } from '@/lib/precheck-key-sync';

const mockPrisma = prisma as unknown as { $executeRaw: jest.Mock };

describe('syncKeyToPrecheck', () => {
  const ORIGINAL_SECRET = process.env.KEY_HMAC_SECRET;

  beforeEach(() => {
    process.env.KEY_HMAC_SECRET = 'test-hmac-secret';
    mockPrisma.$executeRaw = jest.fn().mockResolvedValue(1);
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.KEY_HMAC_SECRET;
    else process.env.KEY_HMAC_SECRET = ORIGINAL_SECRET;
  });

  it('passes org_id into the raw INSERT values', async () => {
    await syncKeyToPrecheck('gov_key_rawvalue', 'user-123', 'org-abc');

    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    const call = mockPrisma.$executeRaw.mock.calls[0];
    // Tagged-template args: call[0] is the strings array, call[1..n] are the interpolated values.
    const [strings, ...values] = call;
    const sql = (strings as TemplateStringsArray).join('?');

    expect(sql).toMatch(/INSERT INTO api_keys \([^)]*\borg_id\b[^)]*\)/);
    expect(sql).toMatch(/VALUES \(/);
    expect(sql).toMatch(/ON CONFLICT \(key_hash\) DO UPDATE/);
    expect(sql).toMatch(/org_id\s*=\s*EXCLUDED\.org_id/);

    expect(values).toContain('org-abc');
    expect(values).toContain('user-123');
  });

  it('forwards expiresAt alongside org_id', async () => {
    const exp = new Date('2030-01-01T00:00:00.000Z');
    await syncKeyToPrecheck('gov_key_rawvalue', 'user-1', 'org-1', exp);

    const [, ...values] = mockPrisma.$executeRaw.mock.calls[0];
    expect(values).toContain('org-1');
    expect(values).toContain(exp);
  });

  it('skips the insert when KEY_HMAC_SECRET is unset', async () => {
    delete process.env.KEY_HMAC_SECRET;
    await syncKeyToPrecheck('gov_key_rawvalue', 'user-1', 'org-1');

    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });
});
