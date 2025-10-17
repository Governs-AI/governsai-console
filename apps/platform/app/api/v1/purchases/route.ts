import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      orgId,
      tool,
      amount,
      currency = 'USD',
      description,
      vendor,
      category,
      correlationId,
      metadata,
      apiKeyId,
    } = body;

    console.log('💰 Purchase API received:', {
      userId,
      orgId,
      tool,
      amount,
      description,
      vendor,
      category
    });

    // Validate required fields
    if (!userId || !orgId || !tool || amount === undefined || amount <= 0) {
      console.error('❌ Missing required fields:', {
        hasUserId: !!userId,
        hasOrgId: !!orgId,
        hasTool: !!tool,
        amount
      });
      return NextResponse.json(
        { error: 'Missing required fields: userId, orgId, tool, amount' },
        { status: 400 }
      );
    }

    // Record the purchase
    const purchase = await prisma.purchaseRecord.create({
      data: {
        userId,
        orgId,
        tool,
        amount: Number(amount),
        currency,
        description,
        vendor,
        category,
        correlationId,
        metadata: metadata || {},
        apiKeyId,
      },
    });

    console.log('✅ Purchase recorded successfully:', purchase.id);

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        amount: purchase.amount,
        tool: purchase.tool,
        description: purchase.description,
        timestamp: purchase.timestamp,
      },
    });
  } catch (error) {
    console.error('❌ Purchase recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record purchase' },
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

    // Get user from session for auth
    const { userId: sessionUserId } = await requireAuth(req);

    const where: any = {
      orgId,
    };

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const purchases = await prisma.purchaseRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
