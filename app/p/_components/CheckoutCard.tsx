"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SAMPLE } from "./sampleCheckout";
import { brandCssVars } from "@/lib/brand-color";
import { startCheckout } from "../actions";
import {
  LockIcon,
  TruckIcon,
  StarIcon,
  WhatsAppIcon,
  InstagramIcon,
} from "../../pay/_components/icons";

/**
 * The buyer checkout — the conversion spine. ONE component, two callers:
 *   1. Public buyer page (/p/[slug]) — interactive, pays → /pay/redirect.
 *   2. The create-page builder's "Live preview" — passes `preview` so the same
 *      layout mirrors the seller's form in real time (non-interactive).
 * Brand-only colours, no processor names, no em dashes. Every accent reads
 * from the seller's brand colour via CSS variables (see lib/brand-color).
 */

/** Which buyer fields the checkout collects. Name is always on. */
export type BuyerFields = {
  phone: boolean;
  email: boolean;
  address: boolean;
};

/** The subset of checkout content the builder controls. */
export type CheckoutData = {
  business: string;
  sellerLogo: string;
  contacts: typeof SAMPLE.contacts;
  productImage: string;
  title: string;
  description: string;
  priceLabel: string;
  delivery: string;
  paidCount: number;
  buyerFields: BuyerFields;
  /** Seller's brand colour ("#RRGGBB"); falls back to Paypoint indigo. */
  accent?: string;
};

const DEFAULT_FIELDS: BuyerFields = { phone: true, email: false, address: false };

const NG_STATES = ["Lagos", "Abuja", "Rivers", "Kano", "Oyo", "Delta", "Enugu", "Kaduna"];

const FAQS = [
  {
    q: "Is my payment secure?",
    a: "Yes. Your payment is protected with bank-grade encryption, and your card details are never shared with the seller.",
  },
  {
    q: "When will I receive my order?",
    a: "After payment, the seller reaches out to confirm your order and delivery details. Delivery timing depends on the seller.",
  },
  {
    q: "Can I get a refund?",
    a: "Refunds are subject to the seller's policy. If you have concerns, contact the seller before completing payment.",
  },
];

export default function CheckoutCard({
  data,
  preview = false,
  slug,
}: {
  data?: Partial<CheckoutData>;
  preview?: boolean;
  /** Live page slug — when present, Pay starts a real charge. */
  slug?: string;
} = {}) {
  const router = useRouter();

  const business = data?.business ?? SAMPLE.business;
  const sellerLogo = data?.sellerLogo ?? SAMPLE.sellerLogo;
  const contacts = data?.contacts ?? SAMPLE.contacts;
  const productImage = data?.productImage ?? SAMPLE.productImage;
  const title = data?.title ?? SAMPLE.title;
  const description = data?.description ?? SAMPLE.description;
  const priceLabel = data?.priceLabel ?? SAMPLE.priceLabel;
  const delivery = data?.delivery ?? SAMPLE.delivery;
  const paidCount = data?.paidCount ?? SAMPLE.paidCount;
  const fields = data?.buyerFields ?? DEFAULT_FIELDS;
  const themeVars = brandCssVars(data?.accent) as React.CSSProperties;

  const displayTitle = title || (preview ? "Your product title" : title);
  const titleMuted = preview && !title;
  const displayPrice = priceLabel || (preview ? "₦0" : priceLabel);
  const initials = (business || "P").trim().slice(0, 2).toUpperCase();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [photoOk, setPhotoOk] = useState(true);
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean; phone?: boolean; address?: boolean }>({});
  const [showFormErr, setShowFormErr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const showPhoto = Boolean(productImage) && photoOk;

  async function handlePay() {
    if (preview || submitting) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = true;
    if (fields.email && !/\S+@\S+\.\S+/.test(email)) next.email = true;
    if (fields.phone && !phone.trim()) next.phone = true;
    if (fields.address && !street.trim()) next.address = true;
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setShowFormErr(true);
      return;
    }
    setShowFormErr(false);
    setPayError(null);
    setSubmitting(true);

    // Sample/prototype checkout (no live slug): keep the demo flow.
    if (!slug) {
      router.push("/pay/redirect");
      return;
    }

    const address = fields.address
      ? [street.trim(), city.trim(), stateVal].filter(Boolean).join(", ")
      : undefined;

    try {
      const res = await startCheckout({ slug, name, email, phone, address });
      if (!res.ok || !res.checkoutUrl) {
        setSubmitting(false);
        setPayError(res.error ?? "Could not start your payment. Please try again.");
        return;
      }
      // Kora's hosted checkout (or the dev-mode interstitial).
      window.location.assign(res.checkoutUrl);
    } catch {
      // Network blip / rejected action — let the buyer retry, never wedge.
      setSubmitting(false);
      setPayError("We couldn't reach the payment service. Check your connection and try again.");
    }
  }

  return (
    <div
      style={themeVars}
      className="w-full max-w-[440px] overflow-hidden rounded-[24px] border border-[#ECEBF3] bg-white shadow-[0_20px_60px_-30px_rgba(20,19,43,0.25)]"
    >
      {/* Product image */}
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={productImage}
          alt={titleMuted ? "" : displayTitle}
          onError={() => setPhotoOk(false)}
          className="h-56 w-full object-cover"
        />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-[#F5F4FF]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/paypoint-wordmark-indigo.png" alt="Paypoint" className="h-7 w-auto opacity-80" />
        </div>
      )}

      {/* Seller row */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand-text)]">
            {sellerLogo && sellerLogo !== SAMPLE.sellerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sellerLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-[#14132B]">{business}</p>
            <p className="text-[11px] text-[#6C6B7B]">Paypoint seller</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#6C6B7B]">
          <LockIcon size={12} /> Secure
        </span>
      </div>

      {/* Product info */}
      <div className="px-5 pt-3.5">
        <h1 className={`text-[22px] font-extrabold leading-tight tracking-[-0.02em] ${titleMuted ? "text-[#9A99A8]" : "text-[#14132B]"}`}>
          {displayTitle}
        </h1>
        <p className="mt-2 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[#14132B]">
          {displayPrice}
        </p>
        {(delivery || paidCount > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {delivery && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6C6B7B]">
                <TruckIcon size={14} /> {delivery}
              </span>
            )}
            {paidCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6C6B7B]">
                <span className="text-[#F5A623]"><StarIcon size={13} /></span> {paidCount} paid
              </span>
            )}
          </div>
        )}
        {description && (
          <p className="mt-3 border-b border-[#ECEBF3] pb-4 text-sm leading-relaxed text-[#33323F]">
            {description}
          </p>
        )}
      </div>

      {/* Your details */}
      <div className="px-5 pt-4">
        <span className="mb-3 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A99A8]">
          Your details
        </span>

        {showFormErr && (
          <div className="mb-3 rounded-[10px] border border-[#F3C6C2] bg-[#FEECEB] px-3 py-2.5 text-[13px] font-semibold text-[#B42318]">
            Please fill in the required fields below.
          </div>
        )}

        <BuyerField
          label="Full name"
          placeholder="Enter your full name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={setName}
          error={errors.name}
          errorText="Please enter your full name so the seller knows who to prepare for."
          preview={preview}
        />
        {fields.email && (
          <BuyerField
            label="Email address"
            placeholder="your@email.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            errorText="Please enter your email address to receive your payment receipt."
            preview={preview}
          />
        )}
        {fields.phone && (
          <BuyerField
            label="Phone number"
            placeholder="080 0000 0000"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            errorText="Please enter your phone number so the seller can contact you."
            preview={preview}
          />
        )}
      </div>

      {/* Delivery address */}
      {fields.address && (
        <div className="px-5 pt-3">
          <span className="mb-3 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A99A8]">
            Delivery address
          </span>
          <BuyerField
            label="Street address"
            placeholder="Enter your delivery address"
            type="text"
            autoComplete="street-address"
            value={street}
            onChange={setStreet}
            error={errors.address}
            errorText="Please enter your delivery address so the seller can ship your order."
            preview={preview}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <BuyerField label="City" placeholder="City" type="text" value={city} onChange={setCity} preview={preview} />
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6C6B7B]">State</label>
              <select
                tabIndex={preview ? -1 : undefined}
                disabled={preview}
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className="h-11 w-full appearance-none rounded-[11px] border border-[#E3E2EE] bg-white px-3 text-sm text-[#14132B] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              >
                <option value="" disabled>State</option>
                {NG_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="px-5 pt-3">
        <div className="rounded-[13px] border border-[#ECEBF3] bg-[#FAFAFE] p-3.5">
          <div className="flex items-center justify-between border-b border-[#ECEBF3] py-1.5">
            <span className="truncate pr-3 text-[13px] text-[#6C6B7B]">{displayTitle}</span>
            <span className="text-[13px] font-semibold text-[#33323F]">{displayPrice}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#ECEBF3] py-1.5">
            <span className="text-[13px] text-[#6C6B7B]">Delivery</span>
            <span className="text-[13px] font-semibold text-[#0B7A4B]">Free</span>
          </div>
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-[15px] font-extrabold text-[#14132B]">Total</span>
            <span className="text-[16px] font-extrabold text-[#14132B]">{displayPrice}</span>
          </div>
        </div>
      </div>

      {/* Trust line */}
      <div className="px-5 pt-3">
        <div className="rounded-[11px] border border-[var(--brand-edge)] bg-[var(--brand-soft)] px-4 py-3 text-center text-xs font-semibold leading-relaxed text-[var(--brand-text)]">
          You&rsquo;re paying {business} directly.
          <br />
          Paypoint never holds your money.
        </div>
      </div>

      {/* Pay button */}
      <div className="px-5 pt-3.5">
        {payError && (
          <div className="mb-3 rounded-[10px] border border-[#F3C6C2] bg-[#FEECEB] px-3 py-2.5 text-[13px] font-semibold text-[#B42318]" role="alert">
            {payError}
          </div>
        )}
        <button
          type="button"
          onClick={handlePay}
          disabled={submitting}
          tabIndex={preview ? -1 : undefined}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--brand)] text-[16px] font-extrabold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:opacity-70"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-[2.5px] border-current opacity-80 [border-top-color:transparent]" />
              Preparing secure payment…
            </>
          ) : (
            <>
              <LockIcon size={16} /> Pay {displayPrice}
            </>
          )}
        </button>
      </div>

      {/* Trust badges */}
      <div className="flex flex-col gap-2 px-5 pt-3.5">
        <TrustRow icon="🔒">Bank-grade secure payment</TrustRow>
        <TrustRow icon="🏦">Money goes directly to the seller</TrustRow>
        <TrustRow icon="🧾">Instant payment confirmation</TrustRow>
      </div>

      {/* Seller contact */}
      {contacts.length > 0 && (
        <div className="px-5 pt-4">
          <div className="rounded-[13px] border border-[#ECEBF3] bg-[#FAFAFE] p-3.5">
            <p className="mb-2.5 text-center text-xs font-semibold text-[#6C6B7B]">
              Have a question before paying?
            </p>
            <div className="flex items-center justify-center gap-2.5">
              {contacts.map((c) => (
                <a
                  key={c.type}
                  href={preview ? undefined : c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={preview ? -1 : undefined}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E2EE] bg-white px-3 py-1.5 text-xs font-medium text-[#33323F] transition hover:border-[var(--brand-edge)] hover:bg-[var(--brand-soft)]"
                >
                  <span className="text-[var(--brand-text)]">
                    {c.type === "whatsapp" ? <WhatsAppIcon size={14} /> : <InstagramIcon size={14} />}
                  </span>
                  {c.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="px-5 pt-4">
        <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A99A8]">
          Questions
        </span>
        {FAQS.map((f, i) => {
          const isOpen = openFaq === i;
          return (
            <div key={f.q} className="border-b border-[#ECEBF3] last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : i)}
                tabIndex={preview ? -1 : undefined}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-sm font-semibold text-[#14132B] transition-colors hover:text-[var(--brand-text)]"
              >
                {f.q}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-[#9A99A8] transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr] pb-3.5" : "grid-rows-[0fr]"}`}>
                <p className="overflow-hidden text-[13px] leading-relaxed text-[#6C6B7B]">{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Powered by */}
      <div className="px-5 pb-6 pt-5 text-center">
        <p className="text-[11px] font-bold text-[#9A99A8]">Powered by</p>
        <p className="mt-0.5 text-[15px] font-extrabold tracking-[-0.02em] text-[#5F58F4]">Paypoint.</p>
        <p className="mt-0.5 text-[11px] text-[#9A99A8]">Get paid for anything you sell</p>
      </div>
    </div>
  );
}

/* ── Reusable buyer field ── */
function BuyerField({
  label,
  placeholder,
  type,
  autoComplete,
  value,
  onChange,
  error,
  errorText,
  preview,
}: {
  label: string;
  placeholder: string;
  type: string;
  autoComplete?: string;
  value?: string;
  onChange?: (v: string) => void;
  error?: boolean;
  errorText?: string;
  preview?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6C6B7B]">
        {label}
      </label>
      <input
        type={type}
        inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={preview}
        tabIndex={preview ? -1 : undefined}
        className={`h-11 w-full rounded-[11px] border bg-white px-3.5 text-sm text-[#14132B] outline-none transition placeholder:text-[#9A99A8] focus:ring-2 focus:ring-[var(--brand-soft)] ${
          error ? "border-[#B42318] focus:border-[#B42318]" : "border-[#E3E2EE] focus:border-[var(--brand)]"
        }`}
      />
      {error && errorText && (
        <p className="mt-1 text-xs leading-relaxed text-[#B42318]">{errorText}</p>
      )}
    </div>
  );
}

function TrustRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-xs font-medium text-[#6C6B7B]">
      <span className="text-[15px]">{icon}</span>
      {children}
    </div>
  );
}
