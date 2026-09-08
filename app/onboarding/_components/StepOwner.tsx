"use client";

import { useState } from "react";
import StepHeader from "./StepHeader";
import ErrorNotice from "./ErrorNotice";

/**
 * KYC stage 2 — verify the business owner by BVN.
 * Runs after the CAC business check. The `verify` callback is the verifyOwner
 * server action (Kora Identity BVN lookup with profile name-matching); the
 * dev fallback simulates success and is labelled "test mode" here. The raw
 * BVN never persists — the action stores only the last 4 digits.
 */

const WHY_ROWS = [
  "Required by Nigerian KYC regulations",
  "Confirms the account owner is a real person",
  "Keeps your payouts flowing without holds",
];

type Status = "idle" | "verifying" | "verified";

export type OwnerVerifyResult = {
  ok: boolean;
  error?: string;
  ownerName?: string;
  dev?: boolean;
};

export default function StepOwner({
  verify,
  onVerified,
  onBack,
}: {
  verify: (bvn: string) => Promise<OwnerVerifyResult>;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [bvn, setBvn] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);

  async function handleVerify() {
    if (status !== "idle") return;
    setError(null);
    if (bvn.replace(/\D/g, "").length !== 11) {
      setError("Enter your 11-digit BVN.");
      return;
    }

    setStatus("verifying");
    try {
      const res = await verify(bvn);
      if (!res.ok) {
        setStatus("idle");
        setError(res.error ?? "Verification failed. Please try again.");
        return;
      }
      setOwnerName(res.ownerName ?? null);
      setIsDev(Boolean(res.dev));
      // No auto-advance: the seller reviews the result and continues themselves.
      setStatus("verified");
    } catch {
      setStatus("idle");
      setError("We couldn't reach the verification service. Please try again.");
    }
  }

  return (
    <div>
      <StepHeader
        heading="Verify the business owner"
        subtitle="Your business checks out. One last step: confirm your identity with your BVN."
      />

      {/* Why we verify — trust panel */}
      <div className="rounded-xl border border-[#ECEBF3] bg-[#FAFAFE] p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[#5F58F4]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
            </svg>
          </span>
          <p className="text-sm leading-relaxed text-[#33323F]">
            <span className="font-semibold text-[#14132B]">
              We never store your BVN.
            </span>{" "}
            It is checked once, securely, and only the result is saved.
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
                {ownerName ? `Verified: ${ownerName}` : "Identity verified"}
              </p>
              <p className="text-xs text-[#0B7A4B]">
                {isDev
                  ? "Test mode — no registry lookup was made."
                  : "Your business is fully verified."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onVerified}
            className="mt-4 h-11 w-full rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6]"
          >
            Continue to dashboard
          </button>
        </>
      ) : (
        <>
          {/* BVN */}
          <div className="mb-5 mt-6">
            <label htmlFor="bvn" className="mb-1.5 block text-xs font-semibold text-[#6C6B7B]">
              Bank Verification Number (BVN)
            </label>
            <input
              id="bvn"
              name="bvn"
              inputMode="numeric"
              autoComplete="off"
              maxLength={11}
              value={bvn}
              onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="22212345678"
              disabled={status === "verifying"}
              className="h-11 w-full rounded-[10px] border border-[#E3E2EE] bg-white px-3.5 text-sm tracking-wide text-[#14132B] outline-none transition placeholder:text-[#9A99A8] focus:border-[#5F58F4] focus:ring-2 focus:ring-[#EEEDFE] disabled:opacity-60"
            />
            <p className="mt-1.5 text-xs text-[#9A99A8]">
              Dial <span className="font-semibold text-[#6C6B7B]">*565*0#</span> on your registered line to see your BVN.
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
                Verifying your identity&hellip;
              </span>
            ) : (
              "Verify identity"
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
        Checked securely. Never stored, never shared.
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
            Finish later
          </button>
        </div>
      )}
    </div>
  );
}
