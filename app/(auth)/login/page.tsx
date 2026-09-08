"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "../_components/AuthShell";
import Field from "../../_components/Field";
import GoogleButton from "../_components/GoogleButton";
import Divider from "../_components/Divider";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

/** Friendly copy for the error codes /auth/callback can send us back with. */
const CALLBACK_ERRORS: Record<string, string> = {
  oauth_denied: "You cancelled the Google sign-in. Try again whenever you're ready.",
  oauth_failed: "Google couldn't complete the sign-in. Please try again.",
  auth_callback_failed:
    "That sign-in link has expired or was already used. Log in again to get a fresh one.",
};

/** Only in-app paths may be used as a post-login destination. */
function safeNext(raw: string | null): string | undefined {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return raw;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const next = safeNext(searchParams.get("next"));

  const [mode, setMode] = useState<"login" | "forgot">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Surface a failed OAuth/email-link callback once, then clean the URL.
  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;
    setError(CALLBACK_ERRORS[code] ?? "Something went wrong signing you in. Please try again.");
    router.replace(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Forgot-password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push(next ?? "/dashboard");
    router.refresh();
  }

  function openForgot() {
    setResetEmail(email);
    setResetSent(false);
    setResetError(null);
    setMode("forgot");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    const target = resetEmail.trim();
    if (!target || resetSending) return;
    setResetSending(true);
    setResetError(null);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    });

    setResetSending(false);
    if (resetErr) {
      setResetError(resetErr.message);
      return;
    }
    setResetSent(true);
  }

  const isForgot = mode === "forgot";

  return (
    <AuthShell
      heading={isForgot ? "Forgot your password?" : "Log in"}
      subheading={
        isForgot
          ? "Enter your email and we'll send you a reset link right away."
          : "Welcome back! Sign in to continue."
      }
      altPrompt={isForgot ? "Remembered it?" : "Don't have an account?"}
      altLinkText={isForgot ? "Back to log in" : "Create one"}
      altHref={isForgot ? "/login" : "/signup"}
      brandHeading="Welcome back."
      brandSub="Manage your checkouts, track payments, and keep your business moving."
    >
      {isForgot ? (
        <>
          <button
            type="button"
            onClick={() => setMode("login")}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6C6B7B] transition-colors hover:text-[#14132B]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to log in
          </button>

          {resetSent ? (
            <div className="rounded-xl border border-[#D4F3E2] bg-[#E7F8EF] p-5 text-center">
              <div className="mb-2 text-3xl">📧</div>
              <p className="text-[15px] font-bold text-[#0B7A4B]">Check your inbox</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#0B7A4B]">
                We&rsquo;ve sent a reset link to{" "}
                <strong className="font-semibold">{resetEmail.trim()}</strong>. It
                expires in 15 minutes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <Field
                label="Email address"
                name="reset-email"
                type="email"
                placeholder="you@business.com"
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              {resetError && (
                <p className="mb-3 text-sm text-[#B42318]" role="alert">
                  {resetError}
                </p>
              )}
              <button
                type="submit"
                disabled={resetSending || !resetEmail.trim()}
                className="mt-1 h-11 w-full rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6] disabled:cursor-not-allowed disabled:bg-[#C7C4F7]"
              >
                {resetSending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-[#F3C6C2] bg-[#FEECEB] p-3.5" role="alert">
              <p className="text-[13px] font-bold text-[#B42318]">
                We couldn&rsquo;t sign you in.
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#B42318]">
                {error}
              </p>
              <button
                type="button"
                onClick={openForgot}
                className="mt-1.5 text-[13px] font-semibold text-[#B42318] underline underline-offset-2 hover:opacity-75"
              >
                Reset your password
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Field
              label="Email address"
              name="email"
              type="email"
              placeholder="you@business.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightSlot={
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-xs font-semibold text-[#5F58F4] transition-colors hover:text-[#4A43D6]"
                >
                  Forgot password?
                </button>
              }
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6] disabled:cursor-not-allowed disabled:bg-[#C7C4F7]"
            >
              {submitting ? "Signing you in…" : "Log in"}
            </button>
          </form>

          <Divider />
          <GoogleButton
            label="Continue with Google"
            next={next}
            onError={(m) => setError(m || null)}
          />
        </>
      )}
    </AuthShell>
  );
}
