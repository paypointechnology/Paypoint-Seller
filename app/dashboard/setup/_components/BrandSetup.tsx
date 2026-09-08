"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepHeader from "../../../onboarding/_components/StepHeader";
import LogoUpload from "../../../onboarding/_components/LogoUpload";
import Field from "../../../_components/Field";
import BrandColorPicker from "../../../_components/BrandColorPicker";
import { createClient } from "@/lib/supabase/client";
import { saveBrand } from "../actions";
import { DEFAULT_BRAND_COLOR, isValidHex } from "@/lib/brand-color";

/**
 * Brand setup — reuses the onboarding StepHeader, LogoUpload and Field, wires
 * real state, uploads the logo to the `logos` bucket at `<uid>/...`, and
 * persists business_name, logo_url and brand_color via the saveBrand action.
 */
export default function BrandSetup() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    firstName.trim() !== "" &&
    businessName.trim() !== "" &&
    logoUrl !== "" &&
    isValidHex(brandColor) &&
    !saving;

  async function handleLogo(file: File) {
    setUploading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You need to be logged in.");

      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    const res = await saveBrand({
      businessName,
      logoUrl,
      brandColor,
      firstName,
      lastName,
    });

    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <StepHeader
        heading="Set up your brand"
        subtitle="This is what buyers see on your checkout."
      />

      <LogoUpload previewUrl={logoUrl} uploading={uploading} onSelect={handleLogo} />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field
            label="First name"
            name="firstName"
            placeholder="Adaeze"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Field
            label="Last name"
            name="lastName"
            placeholder="Okeke"
            autoComplete="family-name"
            optional
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <Field
          label="Business name"
          name="business"
          placeholder="e.g. Adaeze Couture"
          autoComplete="organization"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />

        <BrandColorPicker value={brandColor} onChange={setBrandColor} />

        {error && (
          <p className="mb-3 text-sm text-[#B42318]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 h-11 w-full rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6] disabled:cursor-not-allowed disabled:bg-[#C7C4F7] disabled:hover:bg-[#C7C4F7]"
        >
          {saving ? "Saving…" : "Save & continue"}
        </button>
        {!canSubmit && !saving && (
          <p className="mt-2 text-center text-xs text-[#9A99A8]">
            Add a logo, your first name and business name to continue.
          </p>
        )}
      </form>
    </div>
  );
}
