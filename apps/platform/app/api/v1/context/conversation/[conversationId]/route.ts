import { NextRequest } from 'next/server';
import { GET as getConversationContext } from '../route';

/**
 * GET /api/v1/context/conversation/:conversationId?agentId=&limit=
 *
 * Path form of `GET /api/v1/context/conversation?conversationId=` — the
 * form the TypeScript and Python SDKs call.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/[^/]+\/?$/, '');
  url.searchParams.set('conversationId', conversationId);
  return getConversationContext(new NextRequest(url, { headers: request.headers }));
}
