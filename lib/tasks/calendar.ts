// Calendar math + task-per-day grouping for the Calendar tab (docs/design/03:
// year → month → day drill). Pure and unit-tested — month grids are classic
// off-by-one territory. Weeks start on Sunday (matching the device-default
// iOS/Android calendar apps the developer uses).

import type { Task } from './types';

/** Local calendar day as YYYY-MM-DD — the canonical day key. */
export function localDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
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
