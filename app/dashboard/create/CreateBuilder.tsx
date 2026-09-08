"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import CheckoutCard, {
  type BuyerFields,
  type CheckoutData,
} from "../../p/_components/CheckoutCard";
import { SAMPLE } from "../../p/_components/sampleCheckout";
import { slugify, digitsOnly, nairaLabel } from "../../_lib/format";
import { getSiteUrl } from "@/lib/site-url";
import { createPage } from "./actions";

type PageType = "product" | "service";

const SLUG_FALLBACK = "your-page";

export default function CreateBuilder({
  businessName,
  sellerLogo,
  brandColor,
}: {
  businessName: string;
  sellerLogo: string;
  brandColor?: string;
}) {
  // ── Form state (single source of truth for the live preview) ──────────────
  const [type, setType] = useState<PageType>("product");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(""); // digit string only
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState(""); // object URL or ""
  const [delivery, setDelivery] = useState("");
  const [fields, setFields] = useState<BuyerFields>({
    phone: false,
    email: false,
    address: false,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [published, setPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived values ────────────────────────────────────────────────────────
  const slug = slugify(title) || SLUG_FALLBACK;
  const linkHost = getSiteUrl().replace(/^https?:\/\//, "");
  const canPublish = title.trim().length > 0 && price.length > 0;

  // The exact object the preview card binds to. Memoized so the preview only
  // re-derives when form inputs change.
  const previewData: Partial<CheckoutData> = useMemo(
    () => ({
      // Seller identity comes from the signed-in seller's real profile.
      business: businessName,
      sellerLogo: sellerLogo,
      accent: brandColor,
      contacts: SAMPLE.contacts,
      productImage: photoUrl,
      title: title.trim(),
      description: description.trim(),
      priceLabel: nairaLabel(price),
      delivery: delivery.trim(),
      paidCount: 0, // brand-new page → social proof hidden
      buyerFields: fields,
    }),
    [photoUrl, title, description, price, delivery, fields, businessName, sellerLogo, brandColor],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(null);
    setPhotoUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleField(key: keyof BuyerFields) {
    setFields((f) => ({ ...f, [key]: !f[key] }));
  }

  async function publish() {
    if (!canPublish || publishing) return;
    setPublishing(true);
    setPublishError(null);

    const fd = new FormData();
    fd.set("type", type);
    fd.set("title", title.trim());
    fd.set("price", price);
    fd.set("description", description.trim());
    fd.set("delivery", delivery.trim());
    fd.set("collect_fields", JSON.stringify(fields));
    if (photoFile) fd.set("photo", photoFile);

    const res = await createPage(fd);
    setPublishing(false);
    if (!res.ok) {
      setPublishError(res.error);
      return;
    }
    setPublishedSlug(res.slug);
    setPublished(true);
  }

  function resetForm() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setType("product");
    setTitle("");
    setPrice("");
    setDescription("");
    setPhotoFile(null);
    setPhotoUrl("");
    setDelivery("");
    setFields({ phone: false, email: false, address: false });
    setPublished(false);
    setPublishedSlug("");
    setPublishError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#14132B]">
            Sell anything in minutes
          </h1>
          <p className="mt-1 text-sm text-[#6C6B7B]">
            Create a payment page, share your link, and get paid online.
          </p>
        </div>
        <button
          type="button"
          onClick={publish}
          disabled={!canPublish || publishing}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5F58F4] px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(95,88,244,0.25)] transition hover:bg-[#4A43D6] disabled:cursor-not-allowed disabled:bg-[#C7C4F7] disabled:shadow-none"
        >
          <RocketIcon size={16} />
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </header>

      {publishError && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C6C2] bg-[#FEECEB] px-4 py-3 text-sm font-medium text-[#B42318]"
        >
          {publishError}
        </p>
      )}

      {/* Two-pane builder ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-8">
        {/* ── LEFT: form ─────────────────────────────────────────────── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            publish();
          }}
          className="rounded-[20px] border border-[#ECEBF3] bg-white p-5 shadow-[0_1px_3px_rgba(20,19,43,0.04)] sm:p-6"
        >
          {/* Type toggle */}
          <Label>What are you selling?</Label>
          <div className="mb-5 inline-flex w-full rounded-full border border-[#ECEBF3] bg-[#FAFAFE] p-1 sm:w-auto">
            {(["product", "service"] as PageType[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setType(opt)}
                className={`h-9 flex-1 rounded-full px-5 text-sm font-semibold capitalize transition sm:flex-none ${
                  type === opt
                    ? "bg-[#5F58F4] text-white shadow-[0_1px_2px_rgba(95,88,244,0.25)]"
                    : "text-[#6C6B7B] hover:text-[#33323F]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="mb-5">
            <Label htmlFor="title">What would you like to sell?</Label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "product" ? "e.g. Aso Oke Dress" : "e.g. Bridal Makeup"
              }
              className={inputCls}
            />
          </div>

          {/* Price */}
          <div className="mb-5">
            <Label htmlFor="price">Price</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#6C6B7B]">
                ₦
              </span>
              <input
                id="price"
                type="text"
                inputMode="numeric"
                value={price ? Number(price).toLocaleString("en-NG") : ""}
                onChange={(e) => setPrice(digitsOnly(e.target.value))}
                placeholder="0"
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <Label htmlFor="description" optional>
              Description
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A short, honest description buyers will see."
              className="w-full resize-none rounded-[10px] border border-[#E3E2EE] bg-white px-3.5 py-3 text-sm text-[#14132B] outline-none transition placeholder:text-[#9A99A8] focus:border-[#5F58F4] focus:ring-2 focus:ring-[#EEEDFE]"
            />
            <p className="mt-1.5 text-xs text-[#9A99A8]">
              Help customers understand what they&rsquo;re paying for.
            </p>
          </div>

          {/* Photo */}
          <div className="mb-5">
            <Label optional>Upload a photo</Label>
            <p className="-mt-0.5 mb-2 text-xs text-[#9A99A8]">
              Clear images help buyers trust your product.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              className="hidden"
            />
            {photoUrl ? (
              <div className="relative overflow-hidden rounded-[14px] border border-[#ECEBF3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Selected"
                  className="aspect-[5/3] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#33323F] shadow-sm backdrop-blur transition hover:bg-white"
                >
                  <XIcon size={13} />
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#C7C4F7] bg-[#F5F4FF] px-4 py-7 text-center transition hover:border-[#5F58F4] hover:bg-[#EEEDFE]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5F58F4] shadow-sm">
                  <ImageIcon size={18} />
                </span>
                <span className="text-sm font-semibold text-[#33323F]">
                  Add a photo
                </span>
                <span className="text-xs text-[#9A99A8]">
                  A clear photo gets more buyers
                </span>
              </button>
            )}
          </div>

          {/* Delivery */}
          <div className="mb-6">
            <Label htmlFor="delivery" optional>
              Delivery details
            </Label>
            <input
              id="delivery"
              type="text"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              placeholder="e.g. Nationwide delivery in 3 days"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-[#9A99A8]">
              Let buyers know what to expect.
            </p>
          </div>

          {/* Buyer fields */}
          <div className="mb-6">
            <Label>Information to collect from buyers</Label>
            <div className="flex flex-wrap gap-2">
              <FieldPill label="Name" checked locked />
              <FieldPill
                label="Phone"
                checked={fields.phone}
                onClick={() => toggleField("phone")}
              />
              <FieldPill
                label="Email"
                checked={fields.email}
                onClick={() => toggleField("email")}
              />
              <FieldPill
                label="Address"
                checked={fields.address}
                onClick={() => toggleField("address")}
              />
            </div>
          </div>

          {/* Your link */}
          <div>
            <Label>Your payment link</Label>
            <div className="flex items-center gap-2 rounded-[10px] border border-[#ECEBF3] bg-[#FAFAFE] px-3.5 py-3">
              <LinkIcon size={15} className="shrink-0 text-[#9A99A8]" />
              <span className="min-w-0 truncate text-sm text-[#33323F]">
                <span className="text-[#9A99A8]">{linkHost}/p/</span>
                <span className="font-semibold text-[#5F58F4]">{slug}</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#9A99A8]">
              This is what your customers will click to pay.
            </p>
          </div>
        </form>

        {/* ── RIGHT: live preview ────────────────────────────────────── */}
        <div className="lg:sticky lg:top-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#0B7A4B]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6C6B7B]">
              Live preview
            </span>
          </div>
          <div className="flex justify-center rounded-[20px] border border-[#ECEBF3] bg-[#FAFAFE] p-5 sm:p-6">
            <CheckoutCard data={previewData} preview />
          </div>
        </div>
      </div>

      {/* Success panel ──────────────────────────────────────────────────── */}
      {published && (
        <SuccessPanel
          slug={publishedSlug}
          url={`${getSiteUrl()}/p/${publishedSlug}`}
          onClose={() => setPublished(false)}
          onReset={resetForm}
        />
      )}
    </div>
  );
}

/* ── Success / Publish panel ───────────────────────────────────────────── */
function SuccessPanel({
  slug,
  url,
  onClose,
  onReset,
}: {
  slug: string;
  url: string;
  onClose: () => void;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context / permissions) — no-op.
    }
  }

  async function share() {
    const payload = {
      title: "My Paypoint",
      text: "Pay me securely here:",
      url,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    copy();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#14132B]/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Your payment page is live"
      onClick={onClose}
    >
      <div
        className="animate-onboard-fade w-full max-w-md overflow-hidden rounded-[20px] border border-[#ECEBF3] bg-white shadow-[0_20px_60px_rgba(20,19,43,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center sm:p-7">
          {/* Celebratory mark */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F8EF] text-[#0B7A4B]">
            <CheckCircleIcon size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-[#14132B]">
            Your Paypoint is live!
          </h2>
          <p className="mt-1.5 text-sm text-[#6C6B7B]">
            Share this link anywhere — WhatsApp, Instagram, your bio. Money goes
            straight to your bank.
          </p>

          {/* QR code */}
          <div className="mx-auto mt-5 inline-flex items-center justify-center rounded-[16px] border border-[#ECEBF3] bg-white p-4 shadow-[0_1px_3px_rgba(20,19,43,0.05)]">
            <QRCodeSVG
              value={url}
              size={144}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#5F58F4"
            />
          </div>

          {/* Link + copy */}
          <div className="mt-5 flex items-center gap-2 rounded-[10px] border border-[#E3E2EE] bg-[#FAFAFE] py-2 pl-3.5 pr-2">
            <span className="min-w-0 flex-1 truncate text-left text-sm text-[#33323F]">
              {url}
            </span>
            <button
              type="button"
              onClick={copy}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                copied
                  ? "bg-[#E7F8EF] text-[#0B7A4B]"
                  : "bg-[#5F58F4] text-white hover:bg-[#4A43D6]"
              }`}
            >
              {copied ? (
                <>
                  <CheckIcon size={13} />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon size={13} />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Share */}
          <button
            type="button"
            onClick={share}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5F58F4] text-sm font-semibold text-white transition hover:bg-[#4A43D6]"
          >
            <ShareIcon size={16} />
            Share link
          </button>

          {/* Secondary actions */}
          <div className="mt-3 flex items-center justify-center gap-5 text-sm">
            <Link
              href={`/p/${slug}`}
              className="font-semibold text-[#5F58F4] transition hover:text-[#4A43D6]"
            >
              View page
            </Link>
            <span className="text-[#E3E2EE]">|</span>
            <button
              type="button"
              onClick={onReset}
              className="font-semibold text-[#6C6B7B] transition hover:text-[#33323F]"
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small local building blocks ───────────────────────────────────────── */
const inputCls =
  "h-11 w-full rounded-[10px] border border-[#E3E2EE] bg-white px-3.5 text-sm text-[#14132B] outline-none transition placeholder:text-[#9A99A8] focus:border-[#5F58F4] focus:ring-2 focus:ring-[#EEEDFE]";

function Label({
  children,
  htmlFor,
  optional,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold text-[#6C6B7B]"
    >
      {children}
      {optional && (
        <span className="ml-1.5 font-normal text-[#9A99A8]">Optional</span>
      )}
    </label>
  );
}

function FieldPill({
  label,
  checked,
  locked,
  onClick,
}: {
  label: string;
  checked: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-pressed={checked}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
        checked
          ? "border-[#5F58F4] bg-[#EEEDFE] text-[#5F58F4]"
          : "border-[#E3E2EE] bg-white text-[#6C6B7B] hover:border-[#C7C4F7] hover:bg-[#F5F4FF]"
      } ${locked ? "cursor-default opacity-90" : ""}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
          checked
            ? "border-[#5F58F4] bg-[#5F58F4] text-white"
            : "border-[#C7C4F7] bg-white"
        }`}
      >
        {checked && <CheckIcon size={10} />}
      </span>
      {label}
      {locked && (
        <span className="ml-0.5 text-[#9A99A8]">
          <LockIcon size={11} />
        </span>
      )}
    </button>
  );
}

/* ── Local inline icons (builder-only; buyer-flow icons stay in pay/) ──── */
type IconProps = { size?: number; className?: string };
const svgBase = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ImageIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function LinkIcon({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function XIcon({ size = 13, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CopyIcon({ size = 13, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ size = 13, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} strokeWidth={3} className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CheckCircleIcon({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function ShareIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

function RocketIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function LockIcon({ size = 11, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} className={className} aria-hidden>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
