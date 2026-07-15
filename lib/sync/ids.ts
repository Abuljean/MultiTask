// Client-side id generation for offline inserts.
//
// The legacy tables (task, recurring_task, event) use bigint primary keys —
// task's ids even come from a Hibernate-managed sequence currently near ~2k.
// Offline clients can't ask the sequence, so they mint ids in a range the
// sequence will never reach: milliseconds-since-epoch × 1000 plus a random
// suffix (~1.7e15 — far below Number.MAX_SAFE_INTEGER ≈ 9e15, far above
// anything nextval will produce this millennium). Collisions between two
// devices would need the same millisecond AND the same suffix.
//
// recurring_completion uses a uuid PK, so clients mint uuid v4 strings.

let lastId = 0;

export function newNumericId(): number {
  // Monotonic guard: a tight loop (bulk CSV import) can mint several ids in
  // the same millisecond, where random suffixes alone collide surprisingly
  // often (birthday math: ~1% per 5 ids sharing a ms). Never repeat or go
  // backwards on this device; cross-device uniqueness still rests on the
  // ms + suffix as documented above.
  const candidate = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  lastId = candidate > lastId ? candidate : lastId + 1;
  return lastId;
}

export function newUuid(): string {
  // RFC-4122 v4 via Math.random — fine for client row ids (not security).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
