// Pill coloring per docs/design/02: background = the user-picked color at low
// opacity, text = the same hue but pushed to a readable lightness. The web
// app's stored colors are pale pastels (e.g. #fef3c7), so using them directly
// as text would fail contrast — the spec says the token system auto-adjusts.
// We clamp lightness in HSL space: dark-enough text in light mode, light-enough
// text in dark mode, hue preserved so the pill still reads as "that color".

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslCss({ h, s, l }: Hsl, alpha = 1): string {
  return `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${alpha})`;
}

// ---- WCAG contrast machinery -------------------------------------------
// The lightness clamp alone doesn't GUARANTEE readability: a saturated
// yellow at L=0.32 is still only ~2.5:1 on a light surface (luminance is
// weighted green ≫ red ≫ blue). After clamping we walk lightness further
// until the ratio actually clears 4.5:1 against the composited background.

type Rgb = { r: number; g: number; b: number }; // 0..1

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

function luminance({ r, g, b }: Rgb): number {
  const lin = (ch: number) => (ch <= 0.03928 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Blend `top` at `alpha` over `bottom` (straight alpha compositing). */
function composite(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return {
    r: alpha * top.r + (1 - alpha) * bottom.r,
    g: alpha * top.g + (1 - alpha) * bottom.g,
    b: alpha * top.b + (1 - alpha) * bottom.b,
  };
}

// The card surfaces pills/events sit on (tokens surfaceElevated). Kept as
// literals to avoid an import cycle with tokens.ts; if the surfaces ever
// change there, update here (the tests pin the ratios either way).
const LIGHT_SURFACE: Rgb = { r: 1, g: 1, b: 1 }; // #FFFFFF
const DARK_SURFACE: Rgb = { r: 0x1e / 255, g: 0x1f / 255, b: 0x23 / 255 }; // #1E1F23

/** Darken (light mode) / lighten (dark mode) until ≥`minRatio` on `background`. */
function ensureContrast(text: Hsl, background: Rgb, isDark: boolean, minRatio = 4.5): Hsl {
  const step = isDark ? 0.02 : -0.02;
  let candidate = { ...text };
  for (let i = 0; i < 45; i++) {
    if (contrastRatio(hslToRgb(candidate), background) >= minRatio) return candidate;
    const nextL = candidate.l + step;
    if (nextL <= 0.03 || nextL >= 0.98) break;
    candidate = { ...candidate, l: nextL };
  }
  return candidate; // extreme colors: best effort at the lightness limit
}

export type PillPalette = { background: string; text: string; border: string };

export function pillColors(userColor: string, isDark: boolean): PillPalette {
  const hsl = hexToHsl(userColor) ?? { h: 0, s: 0, l: 0.5 };
  const alpha = isDark ? 0.25 : 0.15;
  // Text: same hue, lightness clamped as a starting point (bump saturation a
  // little so near-grey pastels don't produce muddy text), then verified —
  // and pushed further if needed — against the ACTUAL blended pill
  // background until it clears WCAG 4.5:1.
  const seed: Hsl = {
    h: hsl.h,
    s: Math.min(1, Math.max(hsl.s, 0.45)),
    l: isDark ? Math.max(hsl.l, 0.7) : Math.min(hsl.l, 0.32),
  };
  const surface = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  const pillBackground = composite(hslToRgb(hsl), alpha, surface);
  const text = ensureContrast(seed, pillBackground, isDark);
  return {
    background: hslCss(hsl, alpha),
    text: hslCss(text),
    border: hslCss(text, 0.25),
  };
}

/** Readable TEXT variant of any user-supplied color — same hue, contrast-
 *  guaranteed against the card surface. Event cards use this for their time
 *  text: a CSV can legally say color=#fef08a (pale yellow), which is fine as
 *  a border but illegible as text on a light surface. */
export function readableTextColor(userColor: string, isDark: boolean, minRatio = 4.5): string {
  const hsl = hexToHsl(userColor) ?? { h: 0, s: 0, l: 0.5 };
  const seed: Hsl = {
    h: hsl.h,
    s: Math.min(1, Math.max(hsl.s, 0.45)),
    l: isDark ? Math.max(hsl.l, 0.7) : Math.min(hsl.l, 0.32),
  };
  return hslCss(ensureContrast(seed, isDark ? DARK_SURFACE : LIGHT_SURFACE, isDark, minRatio));
}
