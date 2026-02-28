import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { verifySessionToken } from '@/lib/auth-server';
import { retentionCleanup, type RetentionPolicy } from '@/lib/services/retention-cleanup';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AuthContext {
  userId: string;
  orgId: string;
}

async function resolveAuth(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-governs-key');
  const sessionCookie = request.cookies.get('session')?.value;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const session = verifySessionToken(token);
    if (session) {
      return { userId: session.sub, orgId: session.orgId };
    }
  }

  if (apiKeyHeader) {
    const apiKey = await prisma.aPIKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
      select: { userId: true, orgId: true },
    });

    if (apiKey) {
      return { userId: apiKey.userId, orgId: apiKey.orgId };
    }
  }

  if (sessionCookie) {
    const session = verifySessionToken(sessionCookie);
    if (session) {
      return { userId: session.sub, orgId: session.orgId };
    }
  }

  return null;
}

const allowedKeys: Array<keyof RetentionPolicy> = [
  'user_message',
  'agent_message',
  'tool_result',
  'decision',
  'document',
  'audit_log',
  'decision_log',
  'usage_record',
  'purchase_record',
  'context_access_log',
  'webhook_idempotency',
  'analytics',
  'conversation_archive',
];

function sanitizePolicyInput(payload: unknown): RetentionPolicy {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const result: RetentionPolicy = {};
  const entries = Object.entries(payload as Record<string, unknown>);

  for (const [rawKey, rawValue] of entries) {
    if (!allowedKeys.includes(rawKey as keyof RetentionPolicy)) {
      continue;
    }

    const key = rawKey as keyof RetentionPolicy;

    if (rawValue === null) {
      result[key] = null;
      continue;
    }

    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
      continue;
    }

    const rounded = Math.floor(rawValue);
    if (rounded <= 0) {
      continue;
    }

    result[key] = rounded;
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        policy: retentionCleanup.getRetentionPolicy(),
        defaults: {
          logRetentionDays: 90,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching retention policy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention policy' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const policyInput = sanitizePolicyInput(payload);

    if (Object.keys(policyInput).length === 0) {
      return NextResponse.json(
        { error: 'No valid retention policy fields provided' },
        { status: 400 }
      );
    }

    retentionCleanup.setRetentionPolicy(policyInput);
    const updatedPolicy = retentionCleanup.getRetentionPolicy();

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        orgId: auth.orgId,
        action: 'retention.policy.update',
        resource: 'retention',
        details: {
          updates: policyInput,
          policy: updatedPolicy,
        },
      },
    });

    return NextResponse.json({
      success: true,
      policy: updatedPolicy,
    });
  } catch (error) {
    console.error('Error updating retention policy:', error);
    return NextResponse.json(
      { error: 'Failed to update retention policy' },
      { status: 500 }
    );
  }
}
