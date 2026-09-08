"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveBusiness } from "../settings/actions";
import type { SellerProfile } from "@/lib/data";
import BrandColorPicker from "@/app/_components/BrandColorPicker";
import { DEFAULT_BRAND_COLOR } from "@/lib/brand-color";

/**
 * Settings — client-side form, prefilled with the seller's real profile.
 * Sections: Business (name, WhatsApp phone, brand colour, logo upload + preview — persisted
 * via the saveBusiness server action), Bank account / payouts (from the bank
 * setup step), and Account (email + sign out).
 */

const inputClass =
  "h-11 w-full rounded-[10px] border border-[#E3E2EE] bg-white px-3.5 text-sm text-[#14132B] outline-none transition placeholder:text-[#9A99A8] focus:border-[#5F58F4] focus:ring-2 focus:ring-[#EEEDFE]";
const cardClass =
  "rounded-2xl border border-[#ECEBF3] bg-white p-5 shadow-[0_1px_3px_rgba(20,19,43,0.04)] sm:p-6";

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold tracking-[-0.01em] text-[#14132B]">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-[#6C6B7B]">{description}</p>
      )}
    </div>
  );
}

export default function SettingsForm({ profile }: { profile: SellerProfile }) {
  const router = useRouter();
  const supabase = createClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandColor, setBrandColor] = useState(profile.brandColor || DEFAULT_BRAND_COLOR);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentLogo = logoPreview || profile.logoUrl || "/assets/paypoint-icon.png";
  const logoIsPlaceholder = !logoPreview && !profile.logoUrl;

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    if (logoFile) fd.set("logo", logoFile);
    else fd.delete("logo");

    const res = await saveBusiness(fd);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Business */}
      <form onSubmit={onSave} className={cardClass}>
        <SectionHeader
          title="Business"
          description="This appears on your checkout pages and receipts."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="business-name"
              className="mb-1.5 block text-xs font-semibold text-[#6C6B7B]"
            >
              Business name
            </label>
            <input
              id="business-name"
              name="business_name"
              type="text"
              defaultValue={profile.businessName}
              placeholder="Your business name"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="business-phone"
              className="mb-1.5 block text-xs font-semibold text-[#6C6B7B]"
            >
              WhatsApp phone
            </label>
            <input
              id="business-phone"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              defaultValue={profile.whatsapp}
              placeholder="0801 234 5678"
              className={inputClass}
            />
          </div>
        </div>

        {/* Logo upload + preview */}
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-semibold text-[#6C6B7B]">
            Business logo
          </p>
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#ECEBF3] bg-[#F5F4FF]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentLogo}
                alt="Business logo"
                className={
                  logoIsPlaceholder
                    ? "h-8 w-8 object-contain"
                    : "h-full w-full object-cover"
                }
              />
            </span>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E3E2EE] bg-white px-4 text-sm font-semibold text-[#33323F] transition-colors hover:border-[#C7C4F7] hover:bg-[#F5F4FF] hover:text-[#5F58F4]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 16V4M7 9l5-5 5 5" />
                  <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                Upload logo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="hidden"
              />
              <p className="mt-1.5 text-xs text-[#9A99A8]">
                Shown on your checkout pages and receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Brand colour */}
        <div className="mt-5">
          <BrandColorPicker value={brandColor} onChange={setBrandColor} name="brand_color" />
        </div>

        {error && (
          <p className="mt-4 text-sm text-[#B42318]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#5F58F4] px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(95,88,244,0.25)] transition hover:bg-[#4A43D6] disabled:cursor-not-allowed disabled:bg-[#C7C4F7]"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0B7A4B]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Saved
            </span>
          )}
        </div>
      </form>

      {/* Bank account / payouts */}
      <section className={cardClass}>
        <SectionHeader title="Bank account" />

        {profile.hasBank ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ECEBF3] bg-[#FAFAFE] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[#5F58F4]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 10 12 4l9 6" />
                    <path d="M5 10v8M19 10v8M9 10v8M15 10v8M3 21h18" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#14132B]">
                    {profile.bankName || "Bank account"}
                  </p>
                  <p className="text-sm text-[#6C6B7B]">
                    {profile.accountLast4
                      ? `•••• ${profile.accountLast4}`
                      : profile.accountName}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F8EF] px-2.5 py-1 text-xs font-medium text-[#0B7A4B]">
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                Connected
              </span>
            </div>

            <p className="mt-3 text-sm text-[#6C6B7B]">
              Money settles directly to your bank. We never hold your funds.
            </p>

            <button
              type="button"
              onClick={() => router.push("/dashboard/setup/bank")}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E3E2EE] bg-white px-4 text-sm font-semibold text-[#33323F] transition-colors hover:border-[#C7C4F7] hover:bg-[#F5F4FF] hover:text-[#5F58F4]"
            >
              Change bank
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[#6C6B7B]">
              You haven&rsquo;t connected a bank account yet. Connect one so
              payments can settle straight to your bank.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/setup/bank")}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#5F58F4] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4A43D6]"
            >
              Connect bank account
            </button>
          </>
        )}
      </section>

      {/* Account */}
      <section className={cardClass}>
        <SectionHeader title="Account" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#9A99A8]">Email</p>
            <p className="mt-0.5 text-sm font-medium text-[#14132B]">
              {profile.email || "—"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E3E2EE] bg-white px-4 text-sm font-semibold text-[#B42318] transition-colors hover:border-[#F3C6C2] hover:bg-[#FEECEB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </button>
      </section>
    </div>
  );
}
