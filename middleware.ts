import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Routes that require an authenticated session.
 * NOTE: /verify is intentionally NOT protected — a just-signed-up user has no
 * session yet (email confirmation is ON) and must be able to reach the
 * "check your inbox" screen. /onboarding is retired (setup now lives in the
 * dashboard checklist), so only /dashboard is gated.
 */
const PROTECTED_PREFIXES = ["/dashboard"];
/** Auth routes an already-authenticated user shouldn't see. */
const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  // 1. Refresh the session cookie and resolve the current user.
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // 1b. Auth code delivered somewhere other than /auth/callback (Supabase falls
  //     back to the Site URL when redirectTo isn't on its allowlist). Forward it
  //     so the exchange still completes instead of stranding the user.
  if (request.nextUrl.searchParams.has("code") && !pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // 2. Unauthenticated user hitting a protected route -> /login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 3. Authenticated user hitting an auth route -> /dashboard.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 4. Otherwise pass through with the refreshed session cookie.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image  (Next internals)
     * - favicon / icons / images / static assets
     * - /p/ and /pay/  (public checkout + payment redirect flows)
     * - /api/webhooks  (server-to-server callbacks, no session)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|p/|pay/|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
