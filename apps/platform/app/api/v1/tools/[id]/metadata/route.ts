import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@governs-ai/db';
import { getRequestContext } from '@/lib/session';
import { ensureToolCatalog, toToolMetadata } from '@/lib/tool-catalog';

/**
 * GET /api/v1/tools/:toolName/metadata → { metadata: ToolConfig }
 *
 * What the SDKs fetch to enrich a precheck call with the tool's scope,
 * direction and risk. Looked up by tool name (the catalog is keyed by it);
 * a catalog id also works. Auth: X-Governs-Key or a dashboard session.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = request.headers.get('x-governs-key');
  const authorized = apiKey
    ? await prisma.aPIKey.findFirst({ where: { key: apiKey, isActive: true }, select: { id: true } })
    : await getRequestContext(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureToolCatalog();
  const { id } = await params;
  const name = decodeURIComponent(id);
  const tool =
    (await prisma.toolConfig.findUnique({ where: { toolName: name } })) ||
    (await prisma.toolConfig.findUnique({ where: { id: name } }));

  if (!tool || !tool.isActive) {
    return NextResponse.json({ error: `Tool not found: ${name}` }, { status: 404 });
  }
  return NextResponse.json({ metadata: toToolMetadata(tool) });
}
