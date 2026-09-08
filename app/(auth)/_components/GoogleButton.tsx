"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

/**
 * "Continue with Google": the single place that starts the OAuth 2.0 flow.
 *
 * Flow (Authorization Code + PKCE, handled by Supabase Auth):
 *   1. signInWithOAuth builds the Google consent URL and redirects the browser.
 *   2. Google sends the user back to Supabase's own callback with a code.
 *   3. Supabase redirects to OUR /auth/callback?code=…&next=…
 *   4. /auth/callback exchanges the code for a session cookie and forwards
 *      the user to `next` (default /dashboard).
 *
 * Signup and login share this component, so both flows behave identically;
 * for a first-time Google user Supabase creates the auth user and the
 * handle_new_user trigger creates the profile row.
 */
export default function GoogleButton({
  label,
  next,
  onError,
}: {
  label: string;
  /** In-app path to land on after auth (validated again server-side). */
  next?: string;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    onError?.("");

    const callback = new URL("/auth/callback", getSiteUrl());
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      callback.searchParams.set("next", next);
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        // Always let the user pick which Google account to use; without this,
        // Google silently reuses the last account on shared devices.
        queryParams: { prompt: "select_account" },
      },
    });

    // On success the browser has already navigated away; we only get here
    // when Supabase could not even build the consent URL.
    if (error) {
      setBusy(false);
      onError?.(error.message);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#E3E2EE] bg-white text-sm font-medium text-[#33323F] transition hover:bg-[#FAFAFE] disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#C7C4F7] border-t-[#5F58F4]" aria-hidden />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
          <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
        </svg>
      )}
      {busy ? "Opening Google…" : label}
    </button>
  );
}
