// The contrast auto-adjust is a design invariant (docs/design/02: user
// pastels must stay readable) — HSL math regressions would be invisible in
// tests that don't pin the clamps.
import { pillColors, readableTextColor } from '../pill-colors';

function lightnessOf(hsla: string): number {
  const m = /hsla\(\d+, \d+%, (\d+)%/.exec(hsla);
  if (!m) throw new Error(`Not an hsla string: ${hsla}`);
  return Number(m[1]) / 100;
}

describe('pillColors', () => {
  it('clamps pale pastels to dark text in light mode', () => {
    // #fef3c7 is the web app's default category color — a pale cream.
    const { text } = pillColors('#fef3c7', false);
    expect(lightnessOf(text)).toBeLessThanOrEqual(0.32);
  });

  it('clamps dark colors to light text in dark mode', () => {
    const { text } = pillColors('#1d4ed8', true);
    expect(lightnessOf(text)).toBeGreaterThanOrEqual(0.7);
  });

  it('preserves hue', () => {
    const { text } = pillColors('#f87171', false); // red-ish, hue ≈ 0
    const hue = Number(/hsla\((\d+),/.exec(text)![1]);
    expect(hue).toBeLessThanOrEqual(10);
  });

  it('falls back to neutral grey for invalid input instead of throwing', () => {
    const palette = pillColors('not-a-color', false);
    expect(palette.text).toContain('hsla(0, ');
  });

  it('background keeps low opacity so the card surface shows through', () => {
    const { background } = pillColors('#4ade80', false);
    expect(background).toMatch(/0\.15\)$/);
  });

  it('pushes saturated yellow past the plain clamp until it actually reads (WCAG loop)', () => {
    // Pure yellow at the old L=0.32 clamp was only ~2.5:1 on a light pill.
    // The contrast loop must darken it further.
    const { text } = pillColors('#ffff00', false);
    expect(lightnessOf(text)).toBeLessThan(0.32);
  });

  it('keeps saturated blue readable in dark mode by lightening past the clamp', () => {
    const { text } = pillColors('#0000ff', true);
    expect(lightnessOf(text)).toBeGreaterThan(0.7);
  });
});

describe('readableTextColor', () => {
  it('makes a pale yellow event color legible in light mode', () => {
    expect(lightnessOf(readableTextColor('#fef08a', false))).toBeLessThanOrEqual(0.32);
  });

  it('lightens dark colors in dark mode', () => {
    expect(lightnessOf(readableTextColor('#1e3a8a', true))).toBeGreaterThanOrEqual(0.7);
  });
});
