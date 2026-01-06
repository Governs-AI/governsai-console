import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-server';
import { prisma } from '@governs-ai/db';
import { documentProcessor } from '@/lib/services/document-processor';
import { userResolverService } from '@/lib/services/user-resolver';
import { queueDocumentProcessing } from '@/lib/workers/document-worker';

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

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await resolveAuth(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized - missing org context' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing document file' }, { status: 400 });
    }

    const filename = (formData.get('filename')?.toString() || (file as File).name || 'document').trim();
    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const contentType = formData.get('contentType')?.toString() || (file as File).type || undefined;

    const externalUserId = formData.get('externalUserId')?.toString();
    const externalSource = externalUserId
      ? (formData.get('externalSource')?.toString() || 'default')
      : undefined;
    const metadataRaw = formData.get('metadata')?.toString();
    const scope = formData.get('scope')?.toString() as 'user' | 'org' | undefined;
    const visibility = formData.get('visibility')?.toString() as 'private' | 'team' | 'org' | undefined;
    const email = formData.get('email')?.toString();
    const name = formData.get('name')?.toString();
    const explicitProcessingMode = formData.get('processingMode')?.toString().toLowerCase();

    let resolvedUserId = userId;
    if (externalUserId) {
      const resolved = await userResolverService.resolveExternalUser({
        externalUserId,
        externalSource: externalSource || 'default',
        orgId,
        email,
        name,
      });
      resolvedUserId = resolved.internalUserId;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'Unauthorized - missing user context' }, { status: 401 });
    }

    let metadata: Record<string, any> | undefined;
    if (metadataRaw) {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch {
        return NextResponse.json({ error: 'Invalid metadata JSON' }, { status: 400 });
      }
    }

    const record = await documentProcessor.createDocumentRecord({
      userId: resolvedUserId,
      orgId,
      filename,
      buffer,
      contentType,
      externalUserId,
      externalSource,
      metadata,
      scope,
      visibility,
    });

    const asyncEnabled = explicitProcessingMode
      ? explicitProcessingMode === 'async'
      : (process.env.DOCUMENT_PROCESSING_ASYNC === 'true' || process.env.DOCUMENT_PROCESSING_MODE === 'async');

    if (asyncEnabled) {
      try {
        const jobId = await queueDocumentProcessing({
          documentId: record.documentId,
          orgId,
          filename,
          contentType: record.contentType,
          storageUrl: record.storageUrl,
          fileHash: record.fileHash,
          metadata,
        });

        if (jobId !== 'skipped') {
          return NextResponse.json({
            success: true,
            documentId: record.documentId,
            status: 'processing',
            chunkCount: 0,
            fileHash: record.fileHash,
          });
        }
      } catch (queueError) {
        console.warn('Document queue failed, falling back to sync processing', queueError);
      }
    }

    const processed = await documentProcessor.processDocumentBuffer({
      documentId: record.documentId,
      buffer,
      filename,
      contentType: record.contentType,
      metadata,
    });

    return NextResponse.json({
      success: true,
      documentId: record.documentId,
      status: 'completed',
      chunkCount: processed.chunkCount,
      fileHash: record.fileHash,
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId, orgId } = await resolveAuth(request);
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId') || undefined;
    const externalUserId = searchParams.get('externalUserId') || undefined;
    const externalSource = searchParams.get('externalSource') || undefined;
    const status = searchParams.get('status') || undefined;
    const contentType = searchParams.get('contentType') || undefined;
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const resolvedUserId = externalUserId ? undefined : (queryUserId || authUserId);

    const result = await documentProcessor.listDocuments({
      orgId,
      userId: resolvedUserId,
      externalUserId,
      externalSource,
      status,
      contentType,
      includeArchived,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list documents' },
      { status: 500 }
    );
  }
}
