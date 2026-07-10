// Groups tasks into the list sections from docs/design/03 (Today / Tomorrow /
// Later / No due date), plus Overdue at the top and Completed at the bottom.
// Pure function so it's unit-testable; "today" boundaries are calendar days
// in the device's zone (wall-clock semantics, same as everything else).

import type { Task } from './types';

export type SectionKey = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'noDueDate' | 'completed';

export type TaskSection = {
  key: SectionKey;
  title: string;
  data: Task[];
};

const SECTION_TITLES: Record<SectionKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  upcoming: 'Upcoming',
  noDueDate: 'No due date',
  completed: 'Completed',
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Sort: earlier due date first; ties broken by priority (1st before none). */
function byDueThenPriority(a: Task, b: Task): number {
  const dueDiff = (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);
  if (dueDiff !== 0) return dueDiff;
  return (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER);
}

export function groupTasks(tasks: Task[], now: Date = new Date()): TaskSection[] {
  const buckets: Record<SectionKey, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    upcoming: [],
    noDueDate: [],
    completed: [],
  };

  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterStart = addDays(todayStart, 2);

  for (const task of tasks) {
    if (task.isCompleted) buckets.completed.push(task);
    else if (!task.dueDate) buckets.noDueDate.push(task);
    else if (task.dueDate.getTime() < now.getTime()) buckets.overdue.push(task);
    else if (task.dueDate.getTime() < tomorrowStart.getTime()) buckets.today.push(task);
    else if (task.dueDate.getTime() < dayAfterStart.getTime()) buckets.tomorrow.push(task);
    else buckets.upcoming.push(task);
  }

  // Completed sits at the TOP (collapsed by default in the UI) so the active
  // list below reads strictly by time — developer decision, 2026-07-09.
  const order: SectionKey[] = ['completed', 'overdue', 'today', 'tomorrow', 'upcoming', 'noDueDate'];
  return order
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      key,
      title: SECTION_TITLES[key],
      data: buckets[key].sort(byDueThenPriority),
    }));
}
