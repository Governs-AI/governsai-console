/**
 * V2.12 — API keys are stored as a SHA-256 hash plus a display prefix.
 *
 *  - the full key is in the creation response and nowhere else
 *  - every key-authenticated lookup goes through the hash
 *  - session policy previews mint a short-lived, hidden key
 */

import { createHash } from 'crypto';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';
import { prisma } from '@governs-ai/db';

jest.mock('@/lib/session', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/auth-utils', () => ({ getSessionFromRequest: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/auth-server', () => ({ verifySessionToken: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

import { requireAuth } from '@/lib/session';
import { verifySessionToken } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { apiKeyPrefix, generateApiKey, hashApiKey, keyPreview, PREVIEW_KEY_SCOPE } from '@/lib/api-keys';
import { GET, POST } from '@/app/api/v1/keys/route';
import { POST as PREVIEW } from '@/app/api/v1/policies/preview/route';
import { resolveConfirmationActor } from '@/lib/confirmations';

const mockPrisma = prisma as any;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function req(url: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

beforeEach(() => jest.clearAllMocks());

describe('lib/api-keys', () => {
  it('hashes with plain SHA-256 so every service can look a key up', () => {
    expect(hashApiKey('gai_example')).toBe(sha256('gai_example'));
  });

  it('generates a 256-bit key with its hash and a 12-char prefix', () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    expect(rawKey).toMatch(/^gai_[0-9a-f]{64}$/);
    expect(keyHash).toBe(sha256(rawKey));
    expect(keyPrefix).toBe(rawKey.slice(0, 12));
    expect(apiKeyPrefix(rawKey)).toBe(keyPrefix);
    expect(keyPreview(keyPrefix)).toBe(`${keyPrefix}…`);
  });
});

describe('POST /api/v1/keys', () => {
  it('stores only the hash and prefix, and returns the full key once', async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ orgId: 'org-1', userId: 'user-1' });
    mockPrisma.aPIKey.create.mockImplementation(async ({ data }: any) => ({
      id: 'k1',
      createdAt: new Date(),
      isActive: true,
      ...data,
    }));

    const res = await POST(req('http://localhost/api/v1/keys', 'POST', { name: 'SDK', scopes: ['precheck'] }));
    expect(res.status).toBe(200);
    const body = await res.json();

    const { data } = mockPrisma.aPIKey.create.mock.calls[0][0];
    expect(data).not.toHaveProperty('key');
    expect(data.keyHash).toBe(sha256(body.key));
    expect(data.keyPrefix).toBe(body.key.slice(0, 12));
    expect(JSON.stringify(data)).not.toContain(body.key);
    expect(body.keyPreview).toBe(`${body.key.slice(0, 12)}…`);
  });
});

describe('GET /api/v1/keys', () => {
  it('lists prefixes only and hides preview keys', async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ orgId: 'org-1', userId: 'user-1' });
    mockPrisma.aPIKey.findMany.mockResolvedValue([
      { id: 'k1', name: 'SDK', scopes: [], keyHash: 'f'.repeat(64), keyPrefix: 'gai_0123abcd', isActive: true, createdAt: new Date() },
    ]);

    const res = await GET(req('http://localhost/api/v1/keys'));
    const [row] = await res.json();
    expect(row.keyPreview).toBe('gai_0123abcd…');
    expect(row).not.toHaveProperty('keyHash');
    expect(row).not.toHaveProperty('key');
    expect(mockPrisma.aPIKey.findMany.mock.calls[0][0].where).toEqual({
      orgId: 'org-1',
      NOT: { scopes: { has: PREVIEW_KEY_SCOPE } },
    });
  });
});

describe('key-authenticated lookups', () => {
  it('resolve the X-Governs-Key header by its hash', async () => {
    mockPrisma.aPIKey.findFirst.mockResolvedValue({ id: 'k1', userId: 'u1', orgId: 'o1' });
    const actor = await resolveConfirmationActor(
      req('http://localhost/api/v1/confirmations', 'GET', undefined, { 'x-governs-key': 'gai_live' }),
    );
    expect(actor).toMatchObject({ kind: 'apiKey', orgId: 'o1' });
    expect(mockPrisma.aPIKey.findFirst.mock.calls[0][0].where).toEqual({ keyHash: sha256('gai_live'), isActive: true });
  });

  it('never query APIKey by a plaintext `key` column (source scan)', () => {
    const root = join(__dirname, '..', '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (['node_modules', '.next', '__tests__', '__mocks__'].includes(name)) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) {
          const src = readFileSync(path, 'utf8');
          if (/aPIKey\.\w+\(\{\s*where:\s*\{\s*key\s*:/.test(src) || /\b(apiKey|key|row|keyRecord)\.key\.slice/.test(src)) {
            offenders.push(path.replace(root, ''));
          }
        }
      }
    };
    walk(join(root, 'app'));
    walk(join(root, 'lib'));
    expect(offenders).toEqual([]);
  });
});

describe('POST /api/v1/policies/preview (session)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('mints a short-lived hidden key instead of reusing a stored one', async () => {
    (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'session-token' }) });
    (verifySessionToken as jest.Mock).mockReturnValue({ sub: 'user-1', orgId: 'org-1' });
    mockPrisma.aPIKey.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.aPIKey.create.mockResolvedValue({ id: 'preview' });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ decision: 'transform', raw_text_out: 'Hi <USER_EMAIL>', reasons: [] }),
    });
    global.fetch = fetchMock as any;

    const res = await PREVIEW(req('http://localhost/api/v1/policies/preview', 'POST', { tool: 'model.chat', input: 'Hi a@b.co' }));
    expect(res.status).toBe(200);

    const { data } = mockPrisma.aPIKey.create.mock.calls[0][0];
    expect(data.scopes).toEqual([PREVIEW_KEY_SCOPE]);
    expect(data).not.toHaveProperty('key');
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(data.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60_000);

    const sentKey = fetchMock.mock.calls[0][1].headers['x-governs-key'];
    expect(sha256(sentKey)).toBe(data.keyHash);
  });
});
