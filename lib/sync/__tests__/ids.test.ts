// The id scheme is the backbone of offline inserts — a collision is a
// primary-key conflict that kills a whole import transaction.
import { newNumericId, newUuid } from '../ids';

describe('newNumericId', () => {
  it('never repeats, even minted in a tight loop (same-millisecond case)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) {
      const id = newNumericId();
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  it('is strictly increasing on one device', () => {
    let last = 0;
    for (let i = 0; i < 1_000; i++) {
      const id = newNumericId();
      expect(id).toBeGreaterThan(last);
      last = id;
    }
  });

  it('stays inside the bigint-safe float window', () => {
    const id = newNumericId();
    expect(Number.isSafeInteger(id)).toBe(true);
    // Far above anything the Hibernate sequence will ever produce…
    expect(id).toBeGreaterThan(1e15);
    // …and comfortably below MAX_SAFE_INTEGER (≈9e15).
    expect(id).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

describe('newUuid', () => {
  it('produces RFC-4122 v4 shaped ids', () => {
    for (let i = 0; i < 100; i++) {
      expect(newUuid()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    }
  });

  it('does not repeat across a burst', () => {
    const seen = new Set(Array.from({ length: 1_000 }, () => newUuid()));
    expect(seen.size).toBe(1_000);
  });
});
