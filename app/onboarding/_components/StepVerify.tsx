"use client";

import { useState } from "react";
import StepHeader from "./StepHeader";
import ErrorNotice from "./ErrorNotice";

/**
 * Step 2 — Business Verification (KYB).
 *
 * Collects the RC/BN number and runs it through the `verify` callback (the
 * `verifyBusiness` server action → CAC lookup via Kora Identity). Without a
 * real KORA_SECRET_KEY the action's dev fallback simulates success, flagged
 * so we can label it "test mode" here.
 */

const WHY_ROWS = [
  "Protects you and your buyers from fraud",
  "Builds buyer confidence at checkout",
  "Unlocks instant payouts to your bank",
];

type Status = "idle" | "verifying" | "verified";

export type VerifyResult = {
  ok: boolean;
  error?: string;
  registeredName?: string;
  dev?: boolean;
};

export default function StepVerify({
  verify,
  onVerified,
  onBack,
}: {
  verify: (rcNumber: string) => Promise<VerifyResult>;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [rc, setRc] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);

  async function handleVerify() {
    if (status !== "idle") return;
    setError(null);
    if (!rc.trim()) {
      setError("Enter your RC or BN number.");
      return;
    }

    setStatus("verifying");
    const res = await verify(rc);
    if (!res.ok) {
      setStatus("idle");
      setError(res.error ?? "Verification failed. Please try again.");
      return;
    }

    setRegisteredName(res.registeredName ?? null);
    setIsDev(Boolean(res.dev));
    // No auto-advance: the seller reviews the registry result and continues
    // (or retries with a different number) themselves.
    setStatus("verified");
  }

  function handleRetry() {
    setStatus("idle");
    setRegisteredName(null);
    setError(null);
  }

  return (
    <div>
      <StepHeader
        heading="Verify your business"
        subtitle="A quick check keeps Paypoint safe for you and your buyers. Verified businesses get paid faster."
      />

      {/* Why we verify — trust panel (StepBank visual style) */}
      <div className="rounded-xl border border-[#ECEBF3] bg-[#FAFAFE] p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[#5F58F4]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <p className="text-sm leading-relaxed text-[#33323F]">
            <span className="font-semibold text-[#14132B]">
              Why we verify businesses.
            </span>{" "}
            It keeps Paypoint trusted and your payouts flowing without holds.
          </p>
        </div>

        <ul className="space-y-3">
          {WHY_ROWS.map((row) => (
            <li key={row} className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7F8EF] text-[#12B76A]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span className="text-sm text-[#33323F]">{row}</span>
            </li>
          ))}
        </ul>
      </div>

      {status === "verified" ? (
        /* Success panel — seller reviews the result, then continues */
        <>
          <div className="mt-6 flex items-center gap-3 rounded-[10px] border border-[#D4F3E2] bg-[#E7F8EF] px-4 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B7A4B] text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#14132B]">
                {registeredName ? `Verified: ${registeredName}` : "Business verified"}
              </p>
              <p className="text-xs text-[#0B7A4B]">
                {isDev
                  ? "Test mode — no registry lookup was made."
                  : "This is the registered name we found. Confirm it’s your business to continue."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onVerified}
            className="mt-4 h-11 w-full rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6]"
          >
            Yes, that&rsquo;s my business — continue
          </button>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 h-10 w-full rounded-xl text-sm font-medium text-[#6C6B7B] transition-colors hover:text-[#14132B]"
          >
            Not your business? Verify a different number
          </button>
        </>
      ) : (
        <>
          {/* RC / BN number */}
          <div className="mb-5 mt-6">
            <label htmlFor="rc" className="mb-1.5 block text-xs font-semibold text-[#6C6B7B]">
              RC / BN number
            </label>
            <input
              id="rc"
              name="rc"
              inputMode="numeric"
              autoComplete="off"
              value={rc}
              onChange={(e) => setRc(e.target.value)}
              placeholder="e.g. RC 1234567"
              disabled={status === "verifying"}
              className="h-11 w-full rounded-[10px] border border-[#E3E2EE] bg-white px-3.5 text-sm text-[#14132B] outline-none transition placeholder:text-[#9A99A8] focus:border-[#5F58F4] focus:ring-2 focus:ring-[#EEEDFE] disabled:opacity-60"
            />
            <p className="mt-1.5 text-xs text-[#9A99A8]">
              As it appears on your CAC certificate — include the RC or BN prefix
              (e.g. RC1234567 for companies, BN2345678 for business names).
            </p>
          </div>

          {error && <ErrorNotice>{error}</ErrorNotice>}

          {/* Verify */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={status === "verifying"}
            className="h-11 w-full rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[#5F58F4]"
          >
            {status === "verifying" ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin" aria-hidden>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Verifying your business&hellip;
              </span>
            ) : (
              "Verify business"
            )}
          </button>
        </>
      )}

      {/* Footer reassurance */}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#9A99A8]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Verified securely. Your details are encrypted.
      </p>

      {status === "idle" && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#9A99A8] transition-colors hover:text-[#6C6B7B]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
