import { darkColors, lightColors, radius } from '@/lib/theme/tokens';

import { pickerInputStyle } from '../inline-date-picker-style';

// Regression guard for the padding bug (2026-07-16): react-native-web DROPS
// CSS shorthand strings ('padding: 0 12px', 'border: 1px solid …') — the
// date/time inputs rendered with zero padding, value and icon flush against
// the edges. The style must only ever use longhand numeric properties.
describe('pickerInputStyle', () => {
  const style = pickerInputStyle(darkColors, radius.button);

  it('never uses shorthand padding/border (RNW silently drops them)', () => {
    expect(style).not.toHaveProperty('padding');
    expect(style).not.toHaveProperty('border');
  });

  it('gives the value and the picker icon real breathing room', () => {
    expect(typeof style.paddingLeft).toBe('number');
    expect(typeof style.paddingRight).toBe('number');
    expect(style.paddingLeft).toBeGreaterThanOrEqual(16);
    expect(style.paddingRight).toBeGreaterThanOrEqual(16);
  });

  it('keeps the border as longhand pieces', () => {
    expect(style.borderWidth).toBe(1);
    expect(style.borderStyle).toBe('solid');
    expect(style.borderColor).toBe(darkColors.borderSubtle);
  });

  it('resolves colors from the active theme', () => {
    const light = pickerInputStyle(lightColors, radius.button);
    expect(light.color).toBe(lightColors.textPrimary);
    expect(light.backgroundColor).toBe(lightColors.surfaceSunken);
    expect(style.color).toBe(darkColors.textPrimary);
  });
});
