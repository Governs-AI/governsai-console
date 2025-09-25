import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;

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

  // For protected routes, just pass through - auth will be handled in pages/layouts
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};