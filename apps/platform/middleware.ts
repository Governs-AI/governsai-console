import type { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Allow access to public routes
  if (
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/onboarding") ||
    nextUrl.pathname.startsWith("/auth")
  ) {
    return;
  }

  // For now, just allow all requests
  // The auth logic can be handled in the API routes instead
  return;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|sitemap.xml|robots.txt).*)"],
};
