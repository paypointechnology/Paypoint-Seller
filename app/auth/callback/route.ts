import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + email-link callback (the redirect target Supabase sends users to).
 *
 * Google sign-in: Supabase completes the OAuth 2.0 code exchange with Google
 * on its side, then redirects here with a one-time `code` (PKCE). We swap it
 * for a session, which the server client writes as auth cookies, and forward
 * the user to `next`. Email confirmation and password-reset links land here
 * the same way.
 *
 * Failure paths land on /login?error=<reason> so the page can explain:
 *   oauth_denied         the user cancelled on Google's consent screen
 *   oauth_failed         Google/Supabase reported a provider error
 *   auth_callback_failed the code was missing, expired, or already used
 */

/** Only in-app, single-slash paths; blocks //evil.com and absolute URLs. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Behind a proxy (Vercel, Cloud Run) the public host differs from `origin`.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV !== "development" && forwardedHost
      ? `https://${forwardedHost}`
      : origin;

  // Provider-side failure (e.g. the user hit "Cancel" on Google's screen).
  const providerError = searchParams.get("error");
  if (providerError) {
    const reason = providerError === "access_denied" ? "oauth_denied" : "oauth_failed";
    return NextResponse.redirect(`${base}/login?error=${reason}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
    console.error("[auth/callback] code exchange failed:", error.message);
  }

  return NextResponse.redirect(`${base}/login?error=auth_callback_failed`);
}
