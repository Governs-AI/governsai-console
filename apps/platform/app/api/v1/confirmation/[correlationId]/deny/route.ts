import { NextRequest } from 'next/server';
import { decideConfirmation } from '@/lib/confirmation-decide';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ correlationId: string }> }
) {
  const { correlationId } = await params;
  return decideConfirmation(request, correlationId, 'denied');
}
