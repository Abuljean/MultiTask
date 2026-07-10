import { addHours, formatWallClock, parseWallClock } from '../dates';

describe('parseWallClock', () => {
  test('reads the components as LOCAL time, not UTC', () => {
    const d = parseWallClock('2026-07-10T23:59:00');
    // Local getters must return exactly the written components — if the string
    // had been interpreted as UTC, these would be shifted by the zone offset.
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(0);
  });

  test('tolerates missing seconds and fractional seconds (PostgREST variants)', () => {
    expect(parseWallClock('2026-01-02T03:04').getMinutes()).toBe(4);
    expect(parseWallClock('2026-01-02T03:04:05.123456').getSeconds()).toBe(5);
    expect(parseWallClock('2026-01-02 03:04:05').getHours()).toBe(3);
  });

  test('rejects garbage loudly instead of producing Invalid Date', () => {
    expect(() => parseWallClock('tomorrow')).toThrow();
    expect(() => parseWallClock('')).toThrow();
  });
});

describe('formatWallClock', () => {
  test('serializes LOCAL components with zero-padding, no zone conversion', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5); // Jan 2 2026, 03:04:05 local
    expect(formatWallClock(d)).toBe('2026-01-02T03:04:05');
  });

  test('round-trips: parse(format(d)) preserves the wall-clock moment', () => {
    const original = new Date(2026, 11, 31, 23, 59, 0);
    const roundTripped = parseWallClock(formatWallClock(original));
    expect(roundTripped.getTime()).toBe(original.getTime());
  });
});

describe('addHours', () => {
  test('supports fractional hours and negatives', () => {
    const base = new Date(2026, 6, 15, 12, 0, 0);
    expect(addHours(base, 1.5).getMinutes()).toBe(30);
    expect(addHours(base, -12).getHours()).toBe(0);
  });
});
