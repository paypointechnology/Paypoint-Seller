"use client";

import { useEffect, useId, useState } from "react";
import {
  BRAND_SWATCHES,
  brandTheme,
  normalizeHex,
} from "@/lib/brand-color";

/**
 * Brand colour picker: curated swatches, the native colour wheel, and a hex
 * field for sellers who know their exact brand code. Emits a normalised
 * "#RRGGBB" on every valid change; the live sample shows how the checkout
 * "Pay" button will look, including the auto-picked label colour.
 */
export default function BrandColorPicker({
  value,
  onChange,
  name,
  label = "Brand colour",
}: {
  value: string;
  onChange: (hex: string) => void;
  /** When set, a hidden input carries the value in a plain form post. */
  name?: string;
  label?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value.replace(/^#/, ""));
  const [invalid, setInvalid] = useState(false);
  const theme = brandTheme(value);
  const isSwatch = BRAND_SWATCHES.includes(value);

  // Keep the text field in sync when a swatch or the wheel changes the value.
  useEffect(() => {
    setText(value.replace(/^#/, ""));
    setInvalid(false);
  }, [value]);

  function commit(raw: string) {
    const hex = normalizeHex(raw);
    if (!hex) {
      setInvalid(raw.trim() !== "");
      return;
    }
    setInvalid(false);
    if (hex !== value) onChange(hex);
  }

  return (
    <div className="mb-5">
      <label htmlFor={`${id}-hex`} className="mb-1.5 block text-xs font-semibold text-[#6C6B7B]">
        {label}
      </label>

      {/* Swatches + colour wheel */}
      <div className="flex flex-wrap items-center gap-2.5">
        {BRAND_SWATCHES.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              aria-label={`Use ${c}`}
              aria-pressed={active}
              onClick={() => onChange(c)}
              className={`h-9 w-9 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14132B] focus-visible:ring-offset-2 ${
                active ? "ring-2 ring-[#14132B] ring-offset-2" : "ring-1 ring-[#ECEBF3] hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          );
        })}

        {/* Native colour wheel, styled as the "custom" swatch */}
        <label
          className={`relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full transition ${
            !isSwatch ? "ring-2 ring-[#14132B] ring-offset-2" : "ring-1 ring-[#ECEBF3] hover:scale-105"
          }`}
          style={{
            background: isSwatch
              ? "conic-gradient(#F2870D, #E0397A, #7A3FC9, #1F7AE0, #0B7A4B, #C9A227, #F2870D)"
              : value,
          }}
          title="Pick any colour"
        >
          <span className="sr-only">Pick any colour</span>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label="Pick any colour"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {isSwatch && (
            <span className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#14132B]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          )}
        </label>
      </div>

      {/* Hex code + live sample */}
      <div className="mt-3 flex items-center gap-3">
        <div className="relative w-[148px] shrink-0">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#9A99A8]">
            #
          </span>
          <input
            id={`${id}-hex`}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            value={text}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9a-fA-F#]/g, "").replace(/^#/, "");
              setText(v);
              if (v.length === 6 || v.length === 3) commit(v);
              else setInvalid(false);
            }}
            onBlur={() => commit(text)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(text);
              }
            }}
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-help`}
            placeholder="5F58F4"
            className={`h-11 w-full rounded-[10px] border bg-white pl-7 pr-3 font-mono text-sm uppercase tracking-wider text-[#14132B] outline-none transition placeholder:text-[#C5C4D3] focus:ring-2 focus:ring-[#EEEDFE] ${
              invalid ? "border-[#B42318] focus:border-[#B42318]" : "border-[#E3E2EE] focus:border-[#5F58F4]"
            }`}
          />
        </div>

        <div
          aria-hidden
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-extrabold"
          style={{ backgroundColor: theme.brand, color: theme.onBrand }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          Pay ₦35,000
        </div>
      </div>

      <p id={`${id}-help`} className={`mt-1.5 text-xs ${invalid ? "text-[#B42318]" : "text-[#9A99A8]"}`}>
        {invalid
          ? "Enter a 6-digit hex code, like 5F58F4."
          : "Tap a swatch, use the wheel, or type your brand's hex code. This colours your checkout buttons and accents."}
      </p>

      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
