// 2026-07-16 hardening: the Date constructor silently normalizes bad
// components — parseWallClock must reject them, not shift the deadline.
import { parseWallClock } from '../dates';

describe('parseWallClock component validation', () => {
  it('rejects rolled-over days (Feb 30)', () => {
    expect(() => parseWallClock('2026-02-30T10:00:00')).toThrow('Invalid wall-clock');
  });

  it('rejects hour 25', () => {
    expect(() => parseWallClock('2026-07-10T25:00:00')).toThrow();
  });

  it('rejects minute 61', () => {
    expect(() => parseWallClock('2026-07-10T10:61:00')).toThrow();
  });

  it('rejects month 13', () => {
    expect(() => parseWallClock('2026-13-01T10:00:00')).toThrow();
  });

  it('still accepts valid edge values (leap day, 23:59)', () => {
    const d = parseWallClock('2028-02-29T23:59:00');
    expect(d.getDate()).toBe(29);
    expect(d.getHours()).toBe(23);
  });
});
