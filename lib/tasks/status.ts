// Task status derivation — ported from Task.java (isUrgent / isPastDue).
// This is the logic behind the app's visual heartbeat (the status colors),
// so it is pure, dependency-free, and unit-tested.
//
// Semantics carried over exactly from the web app:
// - completed wins over everything (a done task is never urgent/overdue)
// - no due date → default (nothing to be urgent about)
// - overdue: due date strictly before now
// - urgent:  due date strictly before (now + threshold hours)
// - ongoing: has a due date, but comfortably in the future

import type { Task } from './types';
import { addHours } from './dates';

/** Matches the web app's default (ApplicationUser.urgentThresholdHours). */
export const DEFAULT_URGENCY_THRESHOLD_HOURS = 48;

export type TaskStatus = 'default' | 'ongoing' | 'urgent' | 'overdue' | 'completed';

export function deriveStatus(
  task: Pick<Task, 'isCompleted' | 'dueDate'>,
  options: { now?: Date; urgencyThresholdHours?: number } = {}
): TaskStatus {
  if (task.isCompleted) {
    return 'completed';
  }
  if (!task.dueDate) {
    return 'default';
  }
  const now = options.now ?? new Date();
  if (task.dueDate.getTime() < now.getTime()) {
    return 'overdue';
  }
  const threshold = addHours(now, options.urgencyThresholdHours ?? DEFAULT_URGENCY_THRESHOLD_HOURS);
  if (task.dueDate.getTime() < threshold.getTime()) {
    return 'urgent';
  }
  return 'ongoing';
}
