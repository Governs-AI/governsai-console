import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { requireAuth } from '@/lib/session';
import type { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
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

    const { userId: sessionUserId, orgId } = await requireAuth(req);
    const finalUserId = userId || sessionUserId;

    console.log('💰 Purchase API received:', {
      userId: finalUserId,
      orgId,
      tool,
      amount,
      description,
      vendor,
      category
    });

    // Validate required fields
    if (!finalUserId || !orgId || !tool || amount === undefined || amount <= 0) {
      console.error('❌ Missing required fields:', {
        hasUserId: !!finalUserId,
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
        userId: finalUserId,
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
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to record purchase' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get user from session for auth
    const { orgId } = await requireAuth(req);

    const where: Prisma.PurchaseRecordWhereInput = {
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
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
