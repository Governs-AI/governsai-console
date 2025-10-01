import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Handle CORS for API routes
  if (nextUrl.pathname.startsWith("/api/")) {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Add CORS headers to all API responses
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // Allow access to public routes, API routes, and auth pages
  if (
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/api/") ||
    nextUrl.pathname.startsWith("/auth") ||
    nextUrl.pathname.startsWith("/onboarding") ||
    nextUrl.pathname.startsWith("/_next/") ||
    nextUrl.pathname.includes(".") // Static files
  ) {
    return NextResponse.next();
  }

  // For protected routes like /o/[slug]/*, check for session cookie
  if (nextUrl.pathname.startsWith("/o/")) {
    const sessionToken = req.cookies.get('session')?.value;

    if (!sessionToken) {
      // No session, redirect to login
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};