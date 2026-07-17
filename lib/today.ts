// Local-date helpers for the midnight-rollover fix: "today" is derived
// state, and these two pure functions are what the useToday hook schedules
// around. Wall-clock local time throughout (project date discipline).

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function msUntilNextMidnight(now: Date): number {
  const next = startOfDay(now);
  next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
