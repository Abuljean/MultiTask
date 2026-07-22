// Pure planning for device-calendar sync: which tasks deserve an event and
// what that event looks like. No expo-calendar imports here — this is the
// unit-tested half; lib/device-calendar/sync.ts applies the plan natively.
import type { Task } from '@/lib/tasks/types';

export const EVENT_DURATION_MINUTES = 30;
export const WINDOW_DAYS = 90;
const MARKER_PREFIX = 'multitask:';

export type PlannedCalendarEvent = {
  taskId: number;
  title: string;
  startDate: Date;
  endDate: Date;
  /** `multitask:{task_id}` — the ownership marker. Only events whose notes
   *  carry it are ever touched by the reconciler. */
  notes: string;
};

export function taskEventMarker(taskId: number): string {
  return `${MARKER_PREFIX}${taskId}`;
}

/** Parse a task id back out of an event's notes; null when the event isn't ours. */
export function markerTaskId(notes: string | null | undefined): number | null {
  if (!notes || !notes.startsWith(MARKER_PREFIX)) return null;
  const raw = notes.slice(MARKER_PREFIX.length).split(/\s/)[0];
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

/**
 * One event per open task with a due date, from the start of today (earlier
 * slots today stay visible) out to 90 days. Older overdue tasks live in the
 * app's Overdue section — putting them on the device calendar would bury the
 * past in red noise.
 */
export function planCalendarEvents(
  tasks: Task[],
  now: Date,
  windowDays: number = WINDOW_DAYS
): PlannedCalendarEvent[] {
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  // Calendar-day arithmetic, not fixed 24h blocks — DST crossings would
  // shift the boundary and drop tasks late on the cutoff day (wall-clock
  // discipline, CodeRabbit 2026-07-22).
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + windowDays);
  windowEnd.setHours(23, 59, 59, 999);

  const planned: PlannedCalendarEvent[] = [];
  for (const task of tasks) {
    if (task.isCompleted || task.deletedAt || !task.dueDate) continue;
    const due = task.dueDate;
    if (due < windowStart || due > windowEnd) continue;
    planned.push({
      taskId: task.id,
      title: task.title,
      startDate: due,
      endDate: new Date(due.getTime() + EVENT_DURATION_MINUTES * 60 * 1000),
      notes: taskEventMarker(task.id),
    });
  }
  planned.sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime() || a.taskId - b.taskId
  );
  return planned;
}
