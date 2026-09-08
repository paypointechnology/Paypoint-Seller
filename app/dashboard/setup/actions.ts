"use server";

import { randomInt, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeNgPhone } from "@/lib/phone";
import { normalizeHex } from "@/lib/brand-color";
import { sendOtpTemplate } from "@/lib/whatsapp";
import { verifyBvn, verifyCac } from "@/lib/kora";
import {
  listBanks,
  resolveBankAccount as resolveBankAccountKora,
  type Bank,
} from "@/lib/kora-payments";

/**
 * Setup-step persistence.
 *
 * Each action writes the relevant flags to the signed-in user's `profiles` row
 * so `getSetupStatus()` reflects progress. WhatsApp OTP (Meta Cloud API) and
 * KYB (Kora Identity) are real integrations with dev fallbacks; the bank step
 * is still simulated until the settlement rail (subaccounts/splits) lands.
 *
 * Every action returns a plain `{ ok, error }` result so client wrappers can
 * show inline errors, then navigate on success.
 */

type Result = { ok: boolean; error?: string };

async function updateProfile(patch: Record<string, unknown>): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You need to be logged in." };

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/create");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function saveBrand(input: {
  businessName: string;
  logoUrl: string;
  brandColor: string;
  firstName: string;
  lastName?: string;
}): Promise<Result> {
  // First name is required (it anchors the owner's BVN name-match later);
  // last name is optional.
  if (!input.firstName?.trim()) {
    return { ok: false, error: "Please enter your first name." };
  }
  const brandColor = normalizeHex(input.brandColor);
  if (!brandColor) {
    return { ok: false, error: "Enter a valid brand colour, like #5F58F4." };
  }
  return updateProfile({
    business_name: input.businessName.trim(),
    logo_url: input.logoUrl,
    brand_color: brandColor,
    first_name: input.firstName.trim(),
    last_name: input.lastName?.trim() || null,
  });
}

// ── WhatsApp OTP verification (Phase 2) ──────────────────────────────────────
const OTP_TTL_MIN = 10;
const RESEND_COOLDOWN_S = 30;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generate a 6-digit code, store its hash, and send it over WhatsApp.
 * Rate-limited (cooldown + hourly cap). In dev fallback (no real template) the
 * code isn't sent — it's returned as `devCode` so we can test the flow.
 */
export async function sendWhatsappOtp(input: {
  whatsapp: string;
}): Promise<Result & { dev?: boolean; devCode?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };

  const phone = normalizeNgPhone(input.whatsapp);
  if (!phone) return { ok: false, error: "Enter a valid Nigerian phone number." };

  const admin = createAdminClient();

  // Rate limits: hourly cap + short resend cooldown.
  const { data: recent } = await admin
    .from("phone_otps")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString())
    .order("created_at", { ascending: false });
  const sends = recent ?? [];
  if (sends.length >= MAX_SENDS_PER_HOUR) {
    return { ok: false, error: "Too many code requests. Please try again later." };
  }
  if (
    sends[0] &&
    Date.now() - new Date(sends[0].created_at).getTime() < RESEND_COOLDOWN_S * 1000
  ) {
    return { ok: false, error: "Please wait a few seconds before requesting another code." };
  }

  // Invalidate any earlier unconsumed codes so only the newest is valid.
  await admin
    .from("phone_otps")
    .update({ consumed: true })
    .eq("user_id", user.id)
    .eq("consumed", false);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error: insErr } = await admin.from("phone_otps").insert({
    user_id: user.id,
    phone: phone.e164,
    code_hash: hashCode(code),
    expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
  });
  if (insErr) return { ok: false, error: "Could not start verification. Please try again." };

  const send = await sendOtpTemplate(phone.wa, code);
  if (!send.ok) return { ok: false, error: send.error ?? "Could not send the code." };

  return { ok: true, dev: send.dev, devCode: send.dev ? code : undefined };
}

/**
 * Verify a submitted code against the newest unconsumed OTP for this user.
 * On success, persist the number and mark phone_verified.
 */
export async function verifyWhatsappOtp(input: {
  whatsapp: string;
  code: string;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };

  const phone = normalizeNgPhone(input.whatsapp);
  if (!phone) return { ok: false, error: "Enter a valid Nigerian phone number." };

  const admin = createAdminClient();
  const { data: otp } = await admin
    .from("phone_otps")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", user.id)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return { ok: false, error: "Your code expired. Please request a new one." };
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await admin.from("phone_otps").update({ consumed: true }).eq("id", otp.id);
    return { ok: false, error: "Your code expired. Please request a new one." };
  }
  if ((otp.attempts ?? 0) >= MAX_ATTEMPTS) {
    await admin.from("phone_otps").update({ consumed: true }).eq("id", otp.id);
    return { ok: false, error: "Too many wrong attempts. Please request a new code." };
  }

  if (hashCode(input.code.trim()) !== otp.code_hash) {
    await admin
      .from("phone_otps")
      .update({ attempts: (otp.attempts ?? 0) + 1 })
      .eq("id", otp.id);
    return { ok: false, error: "That code is incorrect. Please try again." };
  }

  // Success — consume the code and mark the profile verified.
  await admin.from("phone_otps").update({ consumed: true }).eq("id", otp.id);
  return updateProfile({ whatsapp: phone.e164, phone_verified: true });
}

// ── Business verification / KYB via Kora Identity (Phase 3) ──────────────────
const KYB_MAX_LOOKUPS_PER_HOUR = 10;

/**
 * Normalize an RC/BN input: uppercase, strip separators, split into the
 * registration type (RC default, BN when prefixed) and the digits — Kora's
 * live API takes them as separate fields.
 */
function normalizeRcNumber(raw: string): { type: "RC" | "BN"; digits: string } | null {
  const v = raw.toUpperCase().replace(/[\s./-]/g, "");
  const m = /^(RC|BN)?(\d{4,10})$/.exec(v);
  if (!m) return null;
  return { type: (m[1] as "RC" | "BN") ?? "RC", digits: m[2] };
}

/**
 * Verify the seller's business registration against CAC via Kora Identity.
 * Every lookup (success or failure) is logged to kyb_verifications, which also
 * backs the hourly rate limit — registry lookups are billed per call. In dev
 * fallback (no KORA_SECRET_KEY) the lookup is simulated and flagged `dev`.
 */
export async function verifyBusiness(input: {
  rcNumber: string;
}): Promise<Result & { dev?: boolean; registeredName?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };

  const rc = normalizeRcNumber(input.rcNumber);
  if (!rc) return { ok: false, error: "Enter a valid RC or BN number, e.g. RC1234567 or BN2345678." };
  const rcLabel = `${rc.type}${rc.digits}`;

  const admin = createAdminClient();

  const { count } = await admin
    .from("kyb_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("id_type", "cac")
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= KYB_MAX_LOOKUPS_PER_HOUR) {
    return { ok: false, error: "Too many verification attempts. Please try again later." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("business_name")
    .eq("id", user.id)
    .maybeSingle();

  const result = await verifyCac(rc.digits, rc.type, profile?.business_name ?? undefined);

  await admin.from("kyb_verifications").insert({
    user_id: user.id,
    id_type: "cac",
    id_value: rcLabel,
    status: result.ok ? "verified" : "failed",
    provider: result.dev ? "dev" : "kora",
    response: result.raw ?? null,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "We couldn't verify that registration number." };
  }

  // Stage 1 of 2: the business checks out. The step (and the setup gate)
  // completes only after the owner's BVN check in verifyOwner.
  const save = await updateProfile({
    kyb_status: "business_verified",
    rc_number: rcLabel,
    kyb_registered_name: result.registeredName ?? null,
    kyb_verified_at: new Date().toISOString(),
  });
  if (!save.ok) return save;

  return { ok: true, dev: result.dev, registeredName: result.registeredName };
}

/**
 * Stage 2 of KYC/KYB: verify the business OWNER by BVN, name-matched against
 * the profile. The raw BVN is never stored — only the last 4 digits, the
 * registry's owner name, and a masked audit row. Sets kyb_status 'verified',
 * which is what the setup gate and checkout require.
 */
export async function verifyOwner(input: {
  bvn: string;
}): Promise<Result & { dev?: boolean; ownerName?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };

  const bvn = input.bvn.replace(/\D/g, "");
  if (!/^\d{11}$/.test(bvn)) {
    return { ok: false, error: "Enter your 11-digit BVN." };
  }

  const admin = createAdminClient();

  const { count } = await admin
    .from("kyb_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("id_type", "bvn")
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= KYB_MAX_LOOKUPS_PER_HOUR) {
    return { ok: false, error: "Too many verification attempts. Please try again later." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, kyb_status")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.kyb_status === "pending") {
    return { ok: false, error: "Verify your business registration first." };
  }

  const result = await verifyBvn(bvn, {
    firstName: profile.first_name ?? undefined,
    lastName: profile.last_name ?? undefined,
  });

  // Policy: a registry hit whose name matches nothing on the profile fails.
  const policyOk = result.ok && result.nameMatched !== false;

  await admin.from("kyb_verifications").insert({
    user_id: user.id,
    id_type: "bvn",
    id_value: `****${bvn.slice(-4)}`,
    status: policyOk ? "verified" : "failed",
    provider: result.dev ? "dev" : "kora",
    response: result.raw ?? null,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "We couldn't verify that BVN." };
  }
  if (!policyOk) {
    return {
      ok: false,
      error:
        "The name on this BVN doesn't match the name on your account. Update your profile name to match your BVN, or check the number.",
    };
  }

  const save = await updateProfile({
    kyb_status: "verified",
    bvn_last4: bvn.slice(-4),
    kyc_owner_name: result.ownerName ?? null,
    kyc_verified_at: new Date().toISOString(),
  });
  if (!save.ok) return save;

  return { ok: true, dev: result.dev, ownerName: result.ownerName };
}

// ── Settlement account (bank) via Kora bank verification ─────────────────────
const BANK_MAX_LOOKUPS_PER_HOUR = 15;

export async function getBanks(): Promise<{ ok: boolean; banks: Bank[]; error?: string }> {
  const res = await listBanks();
  return { ok: res.ok, banks: res.banks, error: res.error };
}

async function rateLimitedResolve(
  userId: string,
  bankCode: string,
  accountNumber: string,
): Promise<ReturnType<typeof resolveBankAccountKora>> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("kyb_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("id_type", "bank")
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= BANK_MAX_LOOKUPS_PER_HOUR) {
    return { ok: false, error: "Too many account checks. Please try again later." };
  }

  const result = await resolveBankAccountKora(bankCode, accountNumber);
  await admin.from("kyb_verifications").insert({
    user_id: userId,
    id_type: "bank",
    id_value: `${bankCode}/****${accountNumber.slice(-4)}`,
    status: result.ok ? "verified" : "failed",
    provider: result.dev ? "dev" : "kora",
    response: result.raw ?? null,
  });
  return result;
}

/** Live account-name check while the seller types (billed — rate limited). */
export async function resolveBank(input: {
  bankCode: string;
  accountNumber: string;
}): Promise<Result & { accountName?: string; dev?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };
  if (!/^\d{10}$/.test(input.accountNumber)) {
    return { ok: false, error: "Enter a valid 10-digit account number." };
  }

  const result = await rateLimitedResolve(user.id, input.bankCode, input.accountNumber);
  if (!result.ok) return { ok: false, error: result.error ?? "Could not confirm that account." };
  return { ok: true, accountName: result.accountName, dev: result.dev };
}

/**
 * Persist the settlement account. Re-resolves server-side so the stored name
 * always comes from the registry, never from the client.
 */
export async function connectBank(input: {
  bankCode: string;
  bankName: string;
  accountNumber: string;
}): Promise<Result & { dev?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };
  if (!/^\d{10}$/.test(input.accountNumber)) {
    return { ok: false, error: "Enter a valid 10-digit account number." };
  }

  const result = await rateLimitedResolve(user.id, input.bankCode, input.accountNumber);
  if (!result.ok || !result.accountName) {
    return { ok: false, error: result.error ?? "Could not confirm that account." };
  }

  const save = await updateProfile({
    bank_code: input.bankCode,
    bank_name: result.bankName ?? input.bankName,
    account_number: input.accountNumber,
    account_last4: input.accountNumber.slice(-4),
    account_name: result.accountName,
  });
  if (!save.ok) return save;
  return { ok: true, dev: result.dev };
}
