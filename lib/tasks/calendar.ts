// Calendar math + task-per-day grouping for the Calendar tab (docs/design/03:
// year → month → day drill). Pure and unit-tested — month grids are classic
// off-by-one territory. Weeks start on Sunday (matching the device-default
// iOS/Android calendar apps the developer uses).

import type { Task } from './types';

/** Local calendar day as YYYY-MM-DD — the canonical day key. The single
 *  implementation: Daily, the calendar, and event grouping all share it, so
 *  "today" can never diverge between views. */
export function localDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Inverse of localDateKey. The key reaches us as a ROUTE PARAM (app/day/
 *  [date]), so garbage is possible — a malformed key falls back to today
 *  instead of producing Invalid Date/NaN downstream. */
export function parseDateKey(key: string): Date {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(key);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate()) {
      return new Date(year, month - 1, day);
    }
  }
  return new Date();
}

/**
 * The month laid out as weeks of 7 cells; cells outside the month are null.
 * `month` is 0-based like the Date API. `alwaysSixWeeks` pads to a constant
 * 6-row grid — the scrolling calendar needs every month the same height so
 * scroll positions are exact.
 */
export function buildMonthMatrix(year: number, month: number, alwaysSixWeeks = false): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay(); // 0 = Sunday

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const targetLength = alwaysSixWeeks ? 42 : Math.ceil(cells.length / 7) * 7;
  while (cells.length < targetLength) {
    cells.push(null);
  }

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Live (non-deleted) tasks with a due date, keyed by their calendar day. */
export function tasksByDay(tasks: Task[]): Map<string, Task[]> {
  const byDay = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.deletedAt || !task.dueDate) continue;
    const key = localDateKey(task.dueDate);
    const existing = byDay.get(key);
    if (existing) existing.push(task);
    else byDay.set(key, [task]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
  }
  return byDay;
}
