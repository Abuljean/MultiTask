// Wall-clock date handling — the subtlest carried-over decision in the app.
//
// The web app deliberately stores due dates as wall-clock LocalDateTime with
// NO timezone: "due Friday 11:59 PM" stays Friday 11:59 PM wherever you are.
// Only "now" is zone-aware. We keep that contract exactly.
//
// Two rules follow, and both have classic failure modes we avoid here:
//
// 1. PARSING: "2026-07-10T23:59:00" (no offset) must become 11:59 PM in the
//    DEVICE's zone. We parse the components manually instead of trusting
//    `new Date(string)`, whose no-offset behavior has historically varied
//    between JS engines (and Hermes is not V8).
//
// 2. FORMATTING: a Date must serialize from its LOCAL components. Using
//    .toISOString() would be a bug — it converts to UTC, silently shifting
//    the deadline by the UTC offset. This is the #1 wall-clock mistake.

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/** "2026-07-10T23:59:00[.123]" → Date at 23:59 local time. */
export function parseWallClock(value: string): Date {
  const m = WALL_CLOCK.exec(value);
  if (!m) {
    throw new Error(`Not a wall-clock datetime: "${value}"`);
  }
  const [, year, month, day, hour, minute, second] = m;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? '0')
  );
}

/** Date at 23:59 local → "2026-07-10T23:59:00" (local components, no zone). */
export function formatWallClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/** Default due time for new tasks: today at 11:59 PM (developer decision). */
export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
}

/** Display format per docs/design/02: "Fri, May 24 · 2:30 PM" (year added
 *  only when it differs from the current year). */
export function formatDueDate(date: Date, now: Date = new Date()): string {
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
