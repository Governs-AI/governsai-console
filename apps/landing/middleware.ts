import { NextResponse } from 'next/server';

export function middleware(req: any) {
  // For now, just pass through all requests
  // TODO: Add routing logic if needed
  return NextResponse.next();
}

export const config = {
  matcher: ['/docs/:path*', '/platform/:path*'],
};