"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeHex } from "@/lib/brand-color";

export type SaveResult = { ok: boolean; error?: string; logoUrl?: string };

/**
 * Persist the seller's business profile (name, WhatsApp phone, brand colour,
 * and optional new logo). Writes are RLS-scoped to the signed-in user. The logo file is
 * uploaded to the owner-scoped `logos/<uid>/` path and its public URL saved.
 */
export async function saveBusiness(formData: FormData): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You are not signed in." };

  const businessName = String(formData.get("business_name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const logo = formData.get("logo");
  const brandColor = normalizeHex(String(formData.get("brand_color") ?? ""));
  if (!brandColor) return { ok: false, error: "Enter a valid brand colour, like #5F58F4." };

  const update: Record<string, string> = {
    business_name: businessName,
    whatsapp,
    brand_color: brandColor,
  };

  // Optional logo upload.
  if (logo instanceof File && logo.size > 0) {
    const ext = logo.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (uploadError) return { ok: false, error: uploadError.message };
    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(path);
    update.logo_url = publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true, logoUrl: update.logo_url };
}
