import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { getRequestContext } from '@/lib/session';
import { ensureToolCatalog, findCatalogTool, toToolMetadata } from '@/lib/tool-catalog';
import { hashApiKey } from '@/lib/api-keys';

/**
 * GET /api/v1/tools/:toolName/metadata → { metadata: ToolConfig }
 *
 * What the SDKs fetch to enrich a precheck call with the tool's scope,
 * direction and risk. Looked up by tool name (the catalog is keyed by it);
 * a catalog id also works. Auth: X-Governs-Key or a dashboard session; the
 * caller's org entry wins over the global one.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get('x-governs-key');
  const orgId = apiKey
    ? (await prisma.aPIKey.findFirst({ where: { keyHash: hashApiKey(apiKey), isActive: true }, select: { orgId: true } }))?.orgId
    : (await getRequestContext(request))?.orgId;
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureToolCatalog();
  const { id } = await params;
  const name = decodeURIComponent(id);
  // The org's own entry if it has one, else the global entry.
  const tool = await findCatalogTool(orgId, name);

  if (!tool || !tool.isActive) {
    return NextResponse.json({ error: `Tool not found: ${name}` }, { status: 404 });
  }
  return NextResponse.json({ metadata: toToolMetadata(tool) });
}
