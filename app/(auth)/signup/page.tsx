"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../_components/AuthShell";
import Field from "../../_components/Field";
import GoogleButton from "../_components/GoogleButton";
import Divider from "../_components/Divider";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  // Frictionless signup: email + password only. Business details, WhatsApp,
  // KYB and bank move into the dashboard setup checklist after login.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    // Email confirmation is ON, so there's no session yet. Send the user to the
    // "check your inbox" screen; the confirmation link lands on /auth/callback.
    router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <AuthShell
      heading="Create your account"
      subheading="Start getting paid in minutes."
      altPrompt="Already have an account?"
      altLinkText="Log in"
      altHref="/login"
      brandHeading="Start getting paid."
      brandSub="Create a checkout, share your link, and money lands straight in your bank."
    >
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
          placeholder="Create a password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <div className="mb-3 rounded-xl border border-[#F3C6C2] bg-[#FEECEB] p-3.5" role="alert">
            <p className="text-[13px] font-bold text-[#B42318]">
              We couldn&rsquo;t create your account.
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#B42318]">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-2 h-11 w-full rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6] disabled:cursor-not-allowed disabled:bg-[#C7C4F7] disabled:hover:bg-[#C7C4F7]"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <Divider />
      <GoogleButton label="Continue with Google" onError={(m) => setError(m || null)} />

      <p className="mt-5 text-center text-xs leading-relaxed text-[#9A99A8]">
        By creating an account, you agree to our{" "}
        <Link href="#" className="text-[#6C6B7B] underline underline-offset-2 hover:text-[#14132B]">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" className="text-[#6C6B7B] underline underline-offset-2 hover:text-[#14132B]">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}
