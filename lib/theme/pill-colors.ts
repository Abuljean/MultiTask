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

export type PillPalette = { background: string; text: string; border: string };

export function pillColors(userColor: string, isDark: boolean): PillPalette {
  const hsl = hexToHsl(userColor) ?? { h: 0, s: 0, l: 0.5 };
  // Text: same hue, lightness clamped to readable. Bump saturation a little so
  // near-grey pastels don't produce muddy text.
  const text: Hsl = {
    h: hsl.h,
    s: Math.min(1, Math.max(hsl.s, 0.45)),
    l: isDark ? Math.max(hsl.l, 0.7) : Math.min(hsl.l, 0.32),
  };
  return {
    background: hslCss(hsl, isDark ? 0.25 : 0.15),
    text: hslCss(text),
    border: hslCss(text, 0.25),
  };
}
