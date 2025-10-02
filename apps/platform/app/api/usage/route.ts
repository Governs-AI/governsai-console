import { NextRequest, NextResponse } from 'next/server';
import { recordUsage } from '@governs-ai/db';
import { calculateCost, getProvider, getCostType } from '@governs-ai/common-utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
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

    // Validate required fields
    if (!userId || !orgId || !model || inputTokens === undefined || outputTokens === undefined) {
      console.error('❌ Missing required fields:', {
        hasUserId: !!userId,
        hasOrgId: !!orgId,
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
      userId,
      orgId,
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
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

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
