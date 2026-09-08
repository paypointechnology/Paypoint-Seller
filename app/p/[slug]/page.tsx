import Link from "next/link";
import CheckoutCard, {
  type BuyerFields,
  type CheckoutData,
} from "../_components/CheckoutCard";
import { createClient } from "@/lib/supabase/server";
import { nairaFromKobo } from "@/app/_lib/format";

/**
 * Public buyer checkout — /p/[slug].
 * Reads the live page through the public_page_by_slug RPC (SECURITY DEFINER,
 * returns only checkout-safe columns for active pages). Lives outside
 * /dashboard, so it gets NO app shell (root layout only).
 */

export const dynamic = "force-dynamic";

type PublicPage = {
  slug: string;
  title: string;
  type: string;
  price_kobo: number;
  currency: string;
  description: string | null;
  image_url: string | null;
  delivery_info: string | null;
  collect_fields: BuyerFields | null;
  customers_served: number;
  business_name: string | null;
  logo_url: string | null;
  brand_color: string | null;
};

async function getPage(slug: string): Promise<PublicPage | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("public_page_by_slug", {
      page_slug: slug,
    });
    if (error || !data || data.length === 0) return null;
    return data[0] as PublicPage;
  } catch {
    return null;
  }
}

export default async function CheckoutPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = await getPage(params.slug);

  return (
    <main className="flex min-h-[100dvh] w-full justify-center bg-[#F5F4FF] px-4 py-6 sm:py-10">
      {page ? <CheckoutCard data={toCheckoutData(page)} slug={page.slug} /> : <Unavailable />}
    </main>
  );
}

/** Map a DB page row to the checkout card's content shape. */
function toCheckoutData(page: PublicPage): CheckoutData {
  const fields: BuyerFields = page.collect_fields ?? {
    phone: false,
    email: false,
    address: false,
  };
  return {
    business: page.business_name || "This business",
    sellerLogo: page.logo_url || "/assets/paypoint-icon.png",
    contacts: [], // seller contact chips are added when contact data is exposed
    productImage: page.image_url || "",
    title: page.title || "",
    description: page.description || "",
    priceLabel: nairaFromKobo(page.price_kobo),
    delivery: page.delivery_info || "",
    paidCount: page.customers_served || 0,
    buyerFields: fields,
    accent: page.brand_color || undefined,
  };
}

/** Calm, branded state for a missing or inactive page (not a 404). */
function Unavailable() {
  return (
    <div className="w-full max-w-[440px] self-center">
      <div className="overflow-hidden rounded-[24px] border border-[#ECEBF3] bg-white p-8 text-center shadow-[0_20px_60px_-30px_rgba(95,88,244,0.35)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F4FF] text-3xl">
          🔒
        </div>
        <h1 className="text-xl font-extrabold tracking-[-0.01em] text-[#14132B]">
          This checkout isn&rsquo;t available anymore.
        </h1>
        <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-[#6C6B7B]">
          It may have been paused or removed by the seller. Please check with the
          seller for an updated link.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-[#E3E2EE] bg-[#FAFAFE] px-5 text-sm font-semibold text-[#33323F] transition hover:border-[#C7C4F7] hover:text-[#5F58F4]"
        >
          Go to Paypoint
        </Link>

        <div className="mt-7 border-t border-[#ECEBF3] pt-5 text-xs text-[#9A99A8]">
          Looking to accept payments yourself?
          <br />
          <Link href="/signup" className="font-bold text-[#5F58F4] hover:text-[#4A43D6]">
            Try Paypoint free →
          </Link>
        </div>
      </div>
    </div>
  );
}
