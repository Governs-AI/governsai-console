/**
 * POST /api/v1/policies/preview
 *
 * Lets an authenticated org admin run a precheck against a sample input
 * using the org's active policy. Returns the same shape precheck would
 * emit — `{decision, raw_text_out, reasons, policy_id, ts}` — so the UI
 * can show "this is what your policy would do with this input."
 *
 * Auth: session cookie OR `x-governs-key` (so dashboard form + SDK can both call it).
 * The active org's policy is consumed by precheck — the caller never has to
 * send the policy explicitly; it's resolved from the API-key → org_id mapping.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { generateApiKey, hashApiKey, PREVIEW_KEY_SCOPE } from '@/lib/api-keys';

const PRECHECK_URL = process.env.PRECHECK_URL || 'http://localhost:8082';

const previewSchema = z.object({
  tool: z.string().min(1).default('chat'),
  input: z.string().min(1).max(10_000),
  scope: z.string().optional(),
});

const PREVIEW_KEY_TTL_MS = 5 * 60_000;

/**
 * Keys are stored hashed, so a session caller has no org key to hand to
 * precheck. Mint a short-lived one instead: precheck and the websocket service
 * treat it like any other key, so the preview decision lands in the audit log
 * exactly as a real request would. Preview keys are hidden from key lists and
 * expired ones are cleaned up here.
 */
async function mintPreviewKey(orgId: string, userId: string): Promise<string> {
  await prisma.aPIKey
    .deleteMany({
      where: { orgId, scopes: { has: PREVIEW_KEY_SCOPE }, expiresAt: { lt: new Date() } },
    })
    .catch(() => undefined);
  const { rawKey, keyHash, keyPrefix } = generateApiKey('gai_prev_');
  await prisma.aPIKey.create({
    data: {
      name: 'Policy preview (temporary)',
      keyHash,
      keyPrefix,
      userId,
      orgId,
      scopes: [PREVIEW_KEY_SCOPE],
      expiresAt: new Date(Date.now() + PREVIEW_KEY_TTL_MS),
    },
  });
  return rawKey;
}

async function resolveOrgKey(request: NextRequest): Promise<{ orgId: string; apiKey: string } | null> {
  // First try x-governs-key — the caller already has an API key.
  const apiKeyHeader = request.headers.get('x-governs-key');
  if (apiKeyHeader) {
    const row = await prisma.aPIKey.findFirst({
      where: { keyHash: hashApiKey(apiKeyHeader), isActive: true },
      select: { orgId: true },
    });
    if (row) return { orgId: row.orgId, apiKey: apiKeyHeader };
  }

  // Otherwise resolve via session and mint a temporary key for the org.
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;
  const session = verifySessionToken(sessionCookie);
  if (!session) return null;

  return { orgId: session.orgId, apiKey: await mintPreviewKey(session.orgId, session.sub) };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveOrgKey(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized — session or x-governs-key required' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { tool, input, scope } = parsed.data;

    // Call precheck with the org's API key. Precheck will resolve the org's
    // active policy from its own copy of the policies table.
    const precheckRes = await fetch(`${PRECHECK_URL}/api/v1/precheck`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-governs-key': auth.apiKey,
      },
      body: JSON.stringify({ tool, raw_text: input, ...(scope ? { scope } : {}) }),
    });

    const responseBody = await precheckRes.json().catch(() => ({} as any));
    if (!precheckRes.ok) {
      return NextResponse.json(
        { error: 'precheck error', status: precheckRes.status, body: responseBody },
        { status: 502 },
      );
    }

    return NextResponse.json({
      decision: responseBody.decision,
      rawTextOut: responseBody.raw_text_out,
      reasons: responseBody.reasons ?? [],
      policyId: responseBody.policy_id,
      ts: responseBody.ts,
    });
  } catch (err) {
    console.error('Policy preview error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
