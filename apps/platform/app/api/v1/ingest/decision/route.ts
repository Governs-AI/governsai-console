import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import crypto from 'crypto';

// HMAC signature verification
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Decision event schema (exactly as Precheck emits)
interface DecisionEvent {
  userId: string;
  tool: string;
  scope: string;
  decision: 'allow' | 'transform' | 'deny';
  policyId?: string;
  reasons?: string[];
  payloadHash: string;
  latencyMs: number;
  timestamp: number;
  correlationId: string;
  tags: string[];
  direction: 'precheck' | 'postcheck';
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Verify HMAC signature
    const signature = request.headers.get('X-Governs-Signature');
    const secret = process.env.GOVERNS_WEBHOOK_SECRET || 'dev-secret';
    
    if (!signature || !verifySignature(body, signature, secret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // Parse the event
    const event: DecisionEvent = JSON.parse(body);
    
    // Validate required fields
    if (!event.userId || !event.decision || !event.payloadHash || !event.direction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Extract org_id from userId (assuming format: org:user or just use userId as org)
    const orgId = event.userId.includes(':') 
      ? event.userId.split(':')[0] 
      : event.userId;
    
    // Store the decision event
    const decision = await prisma.decision.create({
      data: {
        orgId,
        direction: event.direction,
        decision: event.decision,
        tool: event.tool || null,
        scope: event.scope || null,
        detectorSummary: {
          policyId: event.policyId,
          reasons: event.reasons || [],
        },
        payloadHash: event.payloadHash,
        latencyMs: event.latencyMs,
        correlationId: event.correlationId,
        tags: event.tags || [],
        ts: new Date(event.timestamp * 1000), // Convert Unix timestamp to Date
      },
    });
    
    // Log the ingestion for monitoring
    console.log(`Decision ingested: ${decision.id} for org ${orgId}`);
    
    return NextResponse.json(
      { status: 'accepted' },
      { status: 202 }
    );
    
  } catch (error) {
    console.error('Error ingesting decision event:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
