import "server-only";
import { createClient } from "@/lib/supabase/server";
import { nairaFromKobo, relativeDay, agoLabel } from "@/app/_lib/format";
import type { PaymentStatus } from "@/app/dashboard/_components/StatusPill";
import type { SellerPage } from "@/app/dashboard/_components/pagesData";
import type { Payment } from "@/app/dashboard/_components/paymentsData";

/**
 * Read layer for the authenticated seller's dashboard.
 * Every function is scoped to the current user via RLS (auth.uid()) — no
 * user_id filtering needed in the query, the database enforces it. All
 * functions fail safe (empty/zero) when there's no session or Supabase is
 * unreachable, so pages never crash.
 */

export type SellerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string;
  whatsapp: string;
  email: string;
  logoUrl: string;
  brandColor: string;
  bankName: string;
  accountLast4: string;
  accountName: string;
  hasBank: boolean;
};

export type DashboardMetrics = {
  totalLabel: string; // all-time collected
  monthLabel: string; // this calendar month
  monthName: string; // e.g. "July 2026"
  activePages: number;
};

/** Map the DB payment_status enum to the display pill status. */
function toPillStatus(status: string | null): PaymentStatus {
  switch (status) {
    case "success":
      return "Paid";
    case "failed":
    case "refunded":
    case "reversed":
      return "Failed";
    case "abandoned":
      return "Abandoned";
    default:
      return "Pending";
  }
}

/** Current seller's profile, shaped for the UI. Null when no session. */
export async function getProfile(): Promise<SellerProfile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: p } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, business_name, whatsapp, logo_url, brand_color, bank_name, account_last4, account_name, bank_code, account_number",
      )
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      firstName: p?.first_name ?? "",
      lastName: p?.last_name ?? "",
      businessName: p?.business_name ?? "",
      whatsapp: p?.whatsapp ?? "",
      email: user.email ?? "",
      logoUrl: p?.logo_url ?? "",
      brandColor: p?.brand_color ?? "",
      bankName: p?.bank_name ?? "",
      accountLast4: p?.account_last4 ?? "",
      accountName: p?.account_name ?? "",
      // Payout-ready means a verified bank code + full NUBAN — the same gate
      // lib/setup.ts and startCheckout use, so Settings can never disagree.
      hasBank: Boolean(p?.bank_code) && Boolean(p?.account_number),
    };
  } catch {
    return null;
  }
}

/** All of the seller's payment pages, newest first, shaped for PageCard. */
export async function getUserPages(): Promise<SellerPage[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("pages")
      .select(
        "slug, title, type, price_kobo, image_url, is_active, customers_served, created_at",
      )
      .order("created_at", { ascending: false });

    return (data ?? []).map((r) => {
      const served = r.customers_served ?? 0;
      const revenueKobo = served * (r.price_kobo ?? 0);
      return {
        slug: r.slug ?? "",
        title: r.title ?? "Untitled",
        type: r.type === "service" ? "Service" : "Product",
        priceLabel: nairaFromKobo(r.price_kobo),
        paidCount: served,
        active: r.is_active ?? false,
        image: r.image_url ?? "",
        revenueLabel: nairaFromKobo(revenueKobo),
        revenueKobo,
        createdAgo: agoLabel(r.created_at),
        createdAtMs: r.created_at ? new Date(r.created_at).getTime() : 0,
      };
    });
  } catch {
    return [];
  }
}

/** The seller's payments, newest first, shaped for PaymentsList. */
export async function getUserPayments(limit?: number): Promise<Payment[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("payments")
      .select(
        "customer_name, amount_kobo, status, reference, paid_at, created_at, pages(title)",
      )
      .order("created_at", { ascending: false });
    if (limit) query = query.limit(limit);

    const { data } = await query;

    return (data ?? []).map((r) => {
      // Supabase types the embedded relation as an array; take the first.
      const page = Array.isArray(r.pages) ? r.pages[0] : r.pages;
      return {
        customer: r.customer_name ?? "Customer",
        item: page?.title ?? "—",
        amount: nairaFromKobo(r.amount_kobo),
        status: toPillStatus(r.status),
        date: relativeDay(r.paid_at ?? r.created_at),
        reference: r.reference ?? "",
      };
    });
  } catch {
    return [];
  }
}

export type SalesOverview = {
  hasSales: boolean;
  totalLabel: string;
  todayLabel: string;
  todayCount: number;
  weekLabel: string;
  weekDeltaPct: number | null; // this week vs last week
  monthLabel: string;
  monthName: string;
  avgOrderLabel: string;
  successCount: number;
  activePages: number;
  series7d: { day: string; kobo: number }[]; // last 7 days, oldest first
  topCheckouts: { title: string; count: number; label: string }[]; // top 3 by revenue
};

/**
 * Rich sales overview for the dashboard home (Sales Command Center).
 * Aggregates the seller's successful payments into headline figures, a 7-day
 * series, and top checkouts. Fails safe to an all-zero overview.
 */
export async function getSalesOverview(): Promise<SalesOverview> {
  const now = new Date();
  const monthName = now.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  const empty: SalesOverview = {
    hasSales: false,
    totalLabel: nairaFromKobo(0),
    todayLabel: nairaFromKobo(0),
    todayCount: 0,
    weekLabel: nairaFromKobo(0),
    weekDeltaPct: null,
    monthLabel: nairaFromKobo(0),
    monthName,
    avgOrderLabel: nairaFromKobo(0),
    successCount: 0,
    activePages: 0,
    series7d: [],
    topCheckouts: [],
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    const { data: paid } = await supabase
      .from("payments")
      .select("amount_kobo, paid_at, created_at, pages(title)")
      .eq("status", "success");
    const rows = paid ?? [];

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayStart = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const weekStart = todayStart - 6 * 86_400_000;
    const prevWeekStart = weekStart - 7 * 86_400_000;

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayStart - (6 - i) * 86_400_000);
      return { day: d.toLocaleDateString("en-NG", { weekday: "short" }), kobo: 0, ts: startOfDay(d) };
    });
    const byTitle = new Map<string, { count: number; kobo: number }>();

    let totalKobo = 0, todayKobo = 0, todayCount = 0, monthKobo = 0, weekKobo = 0, prevWeekKobo = 0;
    for (const r of rows) {
      const amt = r.amount_kobo ?? 0;
      const when = new Date(r.paid_at ?? r.created_at ?? 0).getTime();
      const wday = startOfDay(new Date(when));
      totalKobo += amt;
      if (wday === todayStart) { todayKobo += amt; todayCount += 1; }
      if (when >= monthStart) monthKobo += amt;
      if (when >= weekStart) weekKobo += amt;
      else if (when >= prevWeekStart) prevWeekKobo += amt;
      const bucket = days.find((dd) => dd.ts === wday);
      if (bucket) bucket.kobo += amt;
      const page = Array.isArray(r.pages) ? r.pages[0] : r.pages;
      const title = page?.title ?? "Untitled";
      const t = byTitle.get(title) ?? { count: 0, kobo: 0 };
      t.count += 1; t.kobo += amt;
      byTitle.set(title, t);
    }

    const successCount = rows.length;
    const avgKobo = successCount > 0 ? Math.round(totalKobo / successCount) : 0;
    const weekDeltaPct = prevWeekKobo > 0 ? Math.round(((weekKobo - prevWeekKobo) / prevWeekKobo) * 100) : null;
    const topCheckouts = Array.from(byTitle.entries())
      .map(([title, v]) => ({ title, count: v.count, kobo: v.kobo, label: nairaFromKobo(v.kobo) }))
      .sort((a, b) => b.kobo - a.kobo)
      .slice(0, 3)
      .map(({ title, count, label }) => ({ title, count, label }));

    const { count: activePages } = await supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    return {
      hasSales: successCount > 0,
      totalLabel: nairaFromKobo(totalKobo),
      todayLabel: nairaFromKobo(todayKobo),
      todayCount,
      weekLabel: nairaFromKobo(weekKobo),
      weekDeltaPct,
      monthLabel: nairaFromKobo(monthKobo),
      monthName,
      avgOrderLabel: nairaFromKobo(avgKobo),
      successCount,
      activePages: activePages ?? 0,
      series7d: days.map((d) => ({ day: d.day, kobo: d.kobo })),
      topCheckouts,
    };
  } catch {
    return empty;
  }
}

export type PaymentRow = {
  customer: string;
  email: string;
  phone: string;
  item: string;
  amountLabel: string;
  amountKobo: number;
  statusRaw: string;
  status: PaymentStatus;
  time: string;
  dateGroup: string;
  dateLabel: string;
  reference: string;
};

export type PaymentsSummary = {
  totalLabel: string;
  count: number;
  avgLabel: string;
  successRate: string;
};

/** Rich payment rows for the Payments screen (grouped, with receipt fields). */
export async function getPaymentsDetailed(): Promise<PaymentRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("payments")
      .select("customer_name, customer_email, customer_phone, amount_kobo, status, reference, paid_at, created_at, pages(title)")
      .order("created_at", { ascending: false });

    return (data ?? []).map((r) => {
      const page = Array.isArray(r.pages) ? r.pages[0] : r.pages;
      const whenIso = r.paid_at ?? r.created_at ?? null;
      const d = whenIso ? new Date(whenIso) : null;
      const time = d ? d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" }) : "";
      const dateLabel = d
        ? `${d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })} · ${time}`
        : "";
      return {
        customer: r.customer_name ?? "Customer",
        email: r.customer_email ?? "",
        phone: r.customer_phone ?? "",
        item: page?.title ?? "Checkout",
        amountLabel: nairaFromKobo(r.amount_kobo),
        amountKobo: r.amount_kobo ?? 0,
        statusRaw: r.status ?? "pending",
        status: toPillStatus(r.status),
        time,
        dateGroup: relativeDay(whenIso),
        dateLabel,
        reference: r.reference ?? "",
      };
    });
  } catch {
    return [];
  }
}

/** Summary figures for the Payments header strip. */
export async function getPaymentsSummary(): Promise<PaymentsSummary> {
  const empty: PaymentsSummary = { totalLabel: nairaFromKobo(0), count: 0, avgLabel: nairaFromKobo(0), successRate: "—" };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;
    const { data } = await supabase.from("payments").select("amount_kobo, status");
    const rows = data ?? [];
    const success = rows.filter((r) => r.status === "success");
    const totalKobo = success.reduce((s, r) => s + (r.amount_kobo ?? 0), 0);
    const avgKobo = success.length > 0 ? Math.round(totalKobo / success.length) : 0;
    const rate = rows.length > 0 ? `${Math.round((success.length / rows.length) * 100)}%` : "—";
    return {
      totalLabel: nairaFromKobo(totalKobo),
      count: rows.length,
      avgLabel: nairaFromKobo(avgKobo),
      successRate: rate,
    };
  } catch {
    return empty;
  }
}

/** Headline metrics for the dashboard/payments cards. */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const monthName = now.toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
  const empty: DashboardMetrics = {
    totalLabel: nairaFromKobo(0),
    monthLabel: nairaFromKobo(0),
    monthName,
    activePages: 0,
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    // Successful payments only count toward money collected.
    const { data: paid } = await supabase
      .from("payments")
      .select("amount_kobo, paid_at, created_at")
      .eq("status", "success");

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let totalKobo = 0;
    let monthKobo = 0;
    for (const row of paid ?? []) {
      const amt = row.amount_kobo ?? 0;
      totalKobo += amt;
      const when = new Date(row.paid_at ?? row.created_at ?? 0).getTime();
      if (when >= monthStart) monthKobo += amt;
    }

    const { count: activePages } = await supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    return {
      totalLabel: nairaFromKobo(totalKobo),
      monthLabel: nairaFromKobo(monthKobo),
      monthName,
      activePages: activePages ?? 0,
    };
  } catch {
    return empty;
  }
}
