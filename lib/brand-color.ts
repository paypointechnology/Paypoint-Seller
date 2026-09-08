/**
 * Brand colour helpers, shared by the picker (client), the server actions that
 * validate what gets stored, and the checkout that renders it. Pure functions
 * only: no React, no server-only imports.
 */

export const DEFAULT_BRAND_COLOR = "#5F58F4";

/** Curated starting points. Sellers can also type any hex. */
export const BRAND_SWATCHES = [
  "#5F58F4", // Paypoint indigo
  "#0B7A4B", // forest
  "#E0397A", // raspberry
  "#F2870D", // tangerine
  "#1F7AE0", // azure
  "#7A3FC9", // violet
  "#C9A227", // gold
  "#14132B", // ink
];

const HEX6 = /^#?([0-9a-f]{6})$/i;
const HEX3 = /^#?([0-9a-f]{3})$/i;

/**
 * Normalise user input to "#RRGGBB" (uppercase). Accepts "5f58f4", "#5F58F4"
 * and the short form "#f4a". Returns null for anything else.
 */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim();
  const m6 = HEX6.exec(v);
  if (m6) return `#${m6[1].toUpperCase()}`;
  const m3 = HEX3.exec(v);
  if (m3) {
    const [r, g, b] = m3[1].split("");
    return `#${(r + r + g + g + b + b).toUpperCase()}`;
  }
  return null;
}

export function isValidHex(input: string | null | undefined): boolean {
  return normalizeHex(input) !== null;
}

function toRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? DEFAULT_BRAND_COLOR;
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** WCAG relative luminance (0 = black, 1 = white). */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mix `hex` toward `target` by `amount` (0..1). */
function mix(hex: string, target: string, amount: number): string {
  const a = toRgb(hex);
  const t = toRgb(target);
  return toHex([
    a[0] + (t[0] - a[0]) * amount,
    a[1] + (t[1] - a[1]) * amount,
    a[2] + (t[2] - a[2]) * amount,
  ]);
}

export type BrandTheme = {
  /** The brand colour itself: buttons, links, icons. */
  brand: string;
  /** Slightly darker, for hover. */
  brandHover: string;
  /** Text colour that stays readable on top of `brand`. */
  onBrand: string;
  /** Very light tint of the brand, for soft backgrounds. */
  brandSoft: string;
  /** A tinted border that pairs with `brandSoft`. */
  brandEdge: string;
  /** Brand colour safe to use as TEXT on white: darkened if the brand is too light. */
  brandText: string;
};

/**
 * Derive every checkout accent from one brand colour, keeping contrast
 * legible regardless of what the seller picked (a pale yellow still gets a
 * readable button label and readable text on white).
 */
export function brandTheme(input: string | null | undefined): BrandTheme {
  const brand = normalizeHex(input) ?? DEFAULT_BRAND_COLOR;
  const onBrand = contrast(brand, "#FFFFFF") >= contrast(brand, "#14132B") ? "#FFFFFF" : "#14132B";
  // Walk the colour toward ink until it reads on white (4.5:1).
  let brandText = brand;
  for (let i = 0; i < 8 && contrast(brandText, "#FFFFFF") < 4.5; i++) {
    brandText = mix(brandText, "#14132B", 0.18);
  }
  return {
    brand,
    brandHover: mix(brand, "#000000", 0.14),
    onBrand,
    brandSoft: mix(brand, "#FFFFFF", 0.9),
    brandEdge: mix(brand, "#FFFFFF", 0.78),
    brandText,
  };
}

/** CSS custom properties for a container; consumed as var(--brand) etc. */
export function brandCssVars(input: string | null | undefined): Record<string, string> {
  const t = brandTheme(input);
  return {
    "--brand": t.brand,
    "--brand-hover": t.brandHover,
    "--on-brand": t.onBrand,
    "--brand-soft": t.brandSoft,
    "--brand-edge": t.brandEdge,
    "--brand-text": t.brandText,
  };
}
