import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const INTERNAL_ACCESS_PATH = "/api/v1/internal/org-access";
const BILLING_RECOVERY_PATHS = new Set([
  "/api/billing/checkout",
  "/api/v1/billing/checkout",
  "/api/billing/webhook",
  "/api/v1/billing/webhook",
  "/api/v1/orgs/active",
  "/api/v1/orgs/join",
  "/api/v1/profile",
]);
const PUBLIC_PATH_PREFIXES = ["/auth", "/onboarding", "/_next/"];

function applyCors(response: Response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes(".")
  );
}

function extractOrgSlug(pathname: string) {
  const match = pathname.match(/^\/o\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isStateChangingMethod(method: string) {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

async function fetchOrgAccess(req: NextRequest, orgSlug?: string | null) {
  const url = new URL(INTERNAL_ACCESS_PATH, req.url);
  if (orgSlug) {
    url.searchParams.set('slug', orgSlug);
  }

  const response = await fetch(url, {
    headers: {
      cookie: req.headers.get('cookie') ?? '',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<{ restricted: boolean }>;
}

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Handle CORS for API routes
  if (nextUrl.pathname.startsWith("/api/")) {
    if (nextUrl.pathname === INTERNAL_ACCESS_PATH) {
      return applyCors(NextResponse.next());
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return applyCors(new Response(null, {
        status: 200,
      }));
    }

    if (
      req.cookies.get('session')?.value &&
      isStateChangingMethod(req.method) &&
      !BILLING_RECOVERY_PATHS.has(nextUrl.pathname) &&
      !nextUrl.pathname.startsWith('/api/v1/auth/')
    ) {
      const access = await fetchOrgAccess(req);

      if (access?.restricted) {
        return applyCors(
          NextResponse.json(
            { error: 'Organization access is restricted until billing is restored' },
            { status: 402 }
          )
        );
      }
    }

    return applyCors(NextResponse.next());
  }

  // Allow access to public routes, API routes, and auth pages
  if (isPublicPath(nextUrl.pathname)) {
    return NextResponse.next();
  }

  // For protected routes like /o/[slug]/*, check for session cookie
  if (nextUrl.pathname.startsWith("/o/")) {
    const sessionToken = req.cookies.get('session')?.value;

    if (!sessionToken) {
      // No session, redirect to login
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    const orgSlug = extractOrgSlug(nextUrl.pathname);
    const isPricingRoute = orgSlug ? nextUrl.pathname === `/o/${orgSlug}/pricing` : false;

    if (orgSlug && !isPricingRoute) {
      const access = await fetchOrgAccess(req, orgSlug);

      if (access?.restricted) {
        const pricingUrl = new URL(`/o/${orgSlug}/pricing`, req.url);
        pricingUrl.searchParams.set('billing', 'restricted');
        return NextResponse.redirect(pricingUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
