import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';
import { documentProcessor } from '@/lib/services/document-processor';

export const runtime = 'nodejs';

async function resolveAuth(request: NextRequest) {
  let userId: string | undefined;
  let orgId: string | undefined;

  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-governs-key');
  const sessionCookie = request.cookies.get('session')?.value;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const session = verifySessionToken(token);
    if (session) {
      userId = session.sub;
      orgId = session.orgId;
    }
  } else if (apiKeyHeader) {
    const apiKey = await prisma.aPIKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
      select: { userId: true, orgId: true },
    });
    if (apiKey) {
      userId = apiKey.userId;
      orgId = apiKey.orgId;
    }
  } else if (sessionCookie) {
    const session = verifySessionToken(sessionCookie);
    if (session) {
      userId = session.sub;
      orgId = session.orgId;
    }
  }

  return { userId, orgId };
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { orgId } = await resolveAuth(request);
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = context.params.id;
    if (!documentId) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeChunks = searchParams.get('includeChunks') === 'true';
    const includeContent = searchParams.get('includeContent') === 'true';

    const document = await documentProcessor.getDocument({
      documentId,
      orgId,
      includeChunks,
      includeContent,
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { orgId } = await resolveAuth(request);
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = context.params.id;
    if (!documentId) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    const result = await documentProcessor.deleteDocument({ documentId, orgId });

    if (!result.deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      fileDeleted: result.fileDeleted,
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
