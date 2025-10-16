import { NextRequest, NextResponse } from 'next/server';
import { recordUsage } from '@governs-ai/db';
import { calculateCost, getProvider, getCostType } from '@governs-ai/common-utils';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Auth: Bearer JWT or X-Governs-Key
    let authUserId: string | undefined;
    let authOrgId: string | undefined;

    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('x-governs-key');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const session = verifySessionToken(token);
      if (session) {
        authUserId = session.sub;
        authOrgId = session.orgId;
      }
    } else if (apiKeyHeader) {
      const apiKey = await prisma.aPIKey.findFirst({
        where: { key: apiKeyHeader, isActive: true },
        select: { userId: true, orgId: true },
      });
      if (apiKey) {
        authUserId = apiKey.userId;
        authOrgId = apiKey.orgId;
      }
    }

    if (!authUserId || !authOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      userId,
      orgId,
      model,
      inputTokens,
      outputTokens,
      tool,
      correlationId,
      metadata,
      apiKeyId,
    } = body;

    console.log('📊 Usage API received:', {
      userId,
      orgId,
      model,
      inputTokens,
      outputTokens,
      tool,
      correlationId
    });

    // Use auth context or body params
    const finalUserId = userId || authUserId;
    const finalOrgId = orgId || authOrgId;

    // Validate required fields
    if (!finalUserId || !finalOrgId || !model || inputTokens === undefined || outputTokens === undefined) {
      console.error('❌ Missing required fields:', {
        hasUserId: !!finalUserId,
        hasOrgId: !!finalOrgId,
        hasModel: !!model,
        inputTokens,
        outputTokens
      });
      return NextResponse.json(
        { error: 'Missing required fields: userId, orgId, model, inputTokens, outputTokens' },
        { status: 400 }
      );
    }

    const provider = getProvider(model);
    const cost = calculateCost(model, inputTokens, outputTokens);
    const costType = getCostType(provider);

    console.log('💰 Calculated cost:', {
      provider,
      model,
      inputTokens,
      outputTokens,
      cost,
      costType
    });

    await recordUsage({
      userId: finalUserId,
      orgId: finalOrgId,
      provider,
      model,
      inputTokens,
      outputTokens,
      cost,
      costType,
      tool,
      correlationId,
      metadata,
      apiKeyId,
    });

    console.log('✅ Usage recorded successfully in database');

    return NextResponse.json({
      success: true,
      cost,
      costType,
      provider,
    });
  } catch (error) {
    console.error('❌ Usage recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auth: Bearer JWT or X-Governs-Key
    let authUserId: string | undefined;
    let authOrgId: string | undefined;

    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('x-governs-key');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const session = verifySessionToken(token);
      if (session) {
        authUserId = session.sub;
        authOrgId = session.orgId;
      }
    } else if (apiKeyHeader) {
      const apiKey = await prisma.aPIKey.findFirst({
        where: { key: apiKeyHeader, isActive: true },
        select: { userId: true, orgId: true },
      });
      if (apiKey) {
        authUserId = apiKey.userId;
        authOrgId = apiKey.orgId;
      }
    }

    if (!authUserId || !authOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') || authOrgId;
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    const { getUsageRecords } = await import('@governs-ai/db');
    
    const records = await getUsageRecords(
      orgId,
      userId || undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit
    );

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching usage records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage records' },
      { status: 500 }
    );
  }
}

