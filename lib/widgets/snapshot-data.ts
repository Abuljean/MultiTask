// Pure builder for the widget's data snapshot (handoff content rule: today's
// tasks, overdue first, else the next task by date). The JS side does ALL the
// thinking — status derivation, ordering, display strings — so the Swift
// widget stays a dumb renderer of ready-to-show rows.
import { deriveStatus } from '@/lib/tasks/status';
import type { Task } from '@/lib/tasks/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY_CAP = 6;

export type WidgetTask = {
  id: number;
  title: string;
  dueLabel: string;
  status: 'overdue' | 'urgent' | 'ongoing' | 'none';
};

export type WidgetSnapshot = {
  /** "Fri, Jul 17" — the mono dateline idiom. */
  dateLabel: string;
  /** Open tasks due today + everything overdue, overdue first (max 6). */
  today: WidgetTask[];
  /** The single next upcoming task — only set when `today` is empty. */
  next: WidgetTask | null;
  /** Total open today+overdue count (today may be capped). */
  openCount: number;
  generatedAt: string;
};

function dayLabel(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function timeLabel(date: Date): string {
  let hours = date.getHours() % 12;
  if (hours === 0) hours = 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
}

function toWidgetTask(task: Task, now: Date, urgencyThresholdHours: number): WidgetTask {
  const status = deriveStatus(task, { now, urgencyThresholdHours });
  const due = task.dueDate as Date;
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  return {
    id: task.id,
    title: task.title,
    // Today's tasks show the time; older overdue ones show which day they
    // slipped from — a bare time would read as "today" and lie.
    dueLabel: sameDay ? timeLabel(due) : dayLabel(due),
    status: status === 'overdue' ? 'overdue' : status === 'urgent' ? 'urgent' : status === 'ongoing' ? 'ongoing' : 'none',
  };
}

export function buildWidgetSnapshot(
  tasks: Task[],
  now: Date,
  urgencyThresholdHours: number
): WidgetSnapshot {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const open = tasks.filter((t) => !t.isCompleted && !t.deletedAt && t.dueDate);
  const todayAndOverdue = open
    .filter((t) => (t.dueDate as Date) <= endOfToday)
    .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime() || a.id - b.id);

  let next: Task | null = null;
  if (todayAndOverdue.length === 0) {
    next =
      open
        .filter((t) => (t.dueDate as Date) > endOfToday)
        .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime() || a.id - b.id)[0] ??
      null;
  }

  return {
    dateLabel: dayLabel(now),
    today: todayAndOverdue.slice(0, TODAY_CAP).map((t) => toWidgetTask(t, now, urgencyThresholdHours)),
    next: next ? toWidgetTask(next, now, urgencyThresholdHours) : null,
    openCount: todayAndOverdue.length,
    generatedAt: now.toISOString(),
  };
}
