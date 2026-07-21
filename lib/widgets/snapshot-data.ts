// Pure builder for the widget's data snapshot. The JS side does ALL the
// thinking — status derivation, ordering, display strings, the small-widget
// fallback — so the Swift widget stays a dumb renderer of ready-to-show rows.
// Content rule (handoff): today's tasks, overdue first; events shown distinct;
// completed-today kept so they can be un-checked; when nothing's due today the
// small widget falls back to upcoming-urgent, then the next day with tasks.
import type { CalendarEvent } from '@/lib/events/use-events';
import { localDateKey } from '@/lib/tasks/calendar';
import { deriveStatus } from '@/lib/tasks/status';
import type { Task } from '@/lib/tasks/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const OPEN_CAP = 8; // open task rows carried before "+N more"
const COMPLETED_CAP = 4; // completed rows kept (so you can un-check them)
const EVENTS_CAP = 6;

export type WidgetTaskStatus = 'overdue' | 'urgent' | 'ongoing' | 'none';

export type WidgetTask = {
  id: number;
  title: string;
  dueLabel: string;
  status: WidgetTaskStatus;
  done: boolean;
};

export type WidgetEvent = {
  id: number;
  title: string;
  timeLabel: string;
};

export type WidgetFallback =
  | { kind: 'urgent'; count: number; title: string; dueLabel: string }
  | { kind: 'nextDay'; dayLabel: string; count: number; title: string }
  | { kind: 'clear' };

export type WidgetSnapshot = {
  dateLabel: string;
  /** Due today + overdue tasks, open first (overdue first), then completed. */
  today: WidgetTask[];
  /** Today's events — rendered distinct from tasks, not completable. */
  events: WidgetEvent[];
  /** Open (not done) today+overdue count, uncapped, for "+N more". */
  openCount: number;
  /** Shown when nothing is due today (openCount === 0); null otherwise. */
  fallback: WidgetFallback | null;
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

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Today's tasks show a time; older overdue ones show which day they slipped
 *  from (a bare time would read as "today" and mislead). */
function dueLabelFor(due: Date, now: Date): string {
  return sameDay(due, now) ? timeLabel(due) : dayLabel(due);
}

function statusFor(task: Task, now: Date, urgencyThresholdHours: number): WidgetTaskStatus {
  // Derive as if open so the accent bar stays meaningful even on completed
  // rows (the widget dims done rows itself).
  const s = deriveStatus({ isCompleted: false, dueDate: task.dueDate }, { now, urgencyThresholdHours });
  return s === 'overdue' ? 'overdue' : s === 'urgent' ? 'urgent' : s === 'ongoing' ? 'ongoing' : 'none';
}

function toWidgetTask(task: Task, now: Date, threshold: number, done: boolean): WidgetTask {
  return {
    id: task.id,
    title: task.title,
    dueLabel: dueLabelFor(task.dueDate as Date, now),
    status: statusFor(task, now, threshold),
    done,
  };
}

export function buildWidgetSnapshot(
  tasks: Task[],
  events: CalendarEvent[],
  now: Date,
  urgencyThresholdHours: number
): WidgetSnapshot {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const dated = tasks.filter((t) => !t.deletedAt && t.dueDate);
  const byDue = (a: Task, b: Task) =>
    (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime() || a.id - b.id;

  const openToday = dated
    .filter((t) => !t.isCompleted && (t.dueDate as Date) <= endOfToday)
    .sort(byDue);
  const doneToday = dated
    .filter((t) => t.isCompleted && (t.dueDate as Date) <= endOfToday)
    // Most-recently-due first — the one you likely just checked stays visible.
    .sort((a, b) => (b.dueDate as Date).getTime() - (a.dueDate as Date).getTime());

  const today: WidgetTask[] = [
    ...openToday.slice(0, OPEN_CAP).map((t) => toWidgetTask(t, now, urgencyThresholdHours, false)),
    ...doneToday.slice(0, COMPLETED_CAP).map((t) => toWidgetTask(t, now, urgencyThresholdHours, true)),
  ];

  const todayKey = localDateKey(now);
  const widgetEvents: WidgetEvent[] = events
    .filter((e) => localDateKey(e.start) === todayKey)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, EVENTS_CAP)
    .map((e) => ({ id: e.id, title: e.title, timeLabel: e.allDay ? 'All day' : timeLabel(e.start) }));

  return {
    dateLabel: dayLabel(now),
    today,
    events: widgetEvents,
    openCount: openToday.length,
    fallback: openToday.length === 0 ? computeFallback(dated, now, urgencyThresholdHours) : null,
    generatedAt: now.toISOString(),
  };
}

function computeFallback(dated: Task[], now: Date, urgencyThresholdHours: number): WidgetFallback {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const upcoming = dated
    .filter((t) => !t.isCompleted && (t.dueDate as Date) > endOfToday)
    .sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime() || a.id - b.id);

  if (upcoming.length === 0) return { kind: 'clear' };

  const thresholdMs = urgencyThresholdHours * 60 * 60 * 1000;
  const urgent = upcoming.filter((t) => (t.dueDate as Date).getTime() - now.getTime() <= thresholdMs);
  if (urgent.length > 0) {
    return {
      kind: 'urgent',
      count: urgent.length,
      title: urgent[0].title,
      dueLabel: dueLabelFor(urgent[0].dueDate as Date, now),
    };
  }

  // The next day that has tasks — "all of the ones on the 25th".
  const firstKey = localDateKey(upcoming[0].dueDate as Date);
  const sameDayTasks = upcoming.filter((t) => localDateKey(t.dueDate as Date) === firstKey);
  return {
    kind: 'nextDay',
    dayLabel: dayLabel(upcoming[0].dueDate as Date),
    count: sameDayTasks.length,
    title: upcoming[0].title,
  };
}
