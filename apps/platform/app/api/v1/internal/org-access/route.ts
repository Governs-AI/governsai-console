import { NextRequest, NextResponse } from 'next/server';
import { getOrgRequestContext, getRequestContext, isOrgBillingRestricted } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const orgSlug = request.nextUrl.searchParams.get('slug') || undefined;
  const baseContext = await getRequestContext(request);

  if (!baseContext) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const context = await getOrgRequestContext(request, { orgSlug });

  if (!context) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json({
    authenticated: true,
    orgId: context.orgId,
    orgSlug: context.orgSlug,
    billingTier: context.billingTier,
    billingStatus: context.billingStatus,
    restricted: isOrgBillingRestricted(context),
  });
}
