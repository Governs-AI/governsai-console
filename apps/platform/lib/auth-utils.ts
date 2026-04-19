import 'server-only';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifySessionToken, SessionData } from './auth-server';

export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    return verifySessionToken(token);
  }

  const sessionCookie = (await cookies()).get('session')?.value;
  if (sessionCookie) {
    return verifySessionToken(sessionCookie);
  }

  return null;
}
