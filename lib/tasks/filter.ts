// Search + filter for the task list (developer request 2026-07-10): text
// search over title/description, and filters by category, subject, and
// urgency level. Any active criterion switches the list to a flat results
// view that hides everything else. Pure and tested.

import { deriveStatus, type TaskStatus } from './status';
import type { Task } from './types';

export type UrgencyFilter = Extract<TaskStatus, 'overdue' | 'urgent' | 'ongoing'>;

export type TaskFilters = {
  query: string;
  category: string | null;
  subject: string | null;
  urgency: UrgencyFilter | null;
  /** 1/2/3 = that tier; 0 = tasks with NO priority; null = filter inactive. */
  priority: number | null;
};

export const EMPTY_FILTERS: TaskFilters = {
  query: '',
  category: null,
  subject: null,
  urgency: null,
  priority: null,
};

export function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.category !== null ||
    filters.subject !== null ||
    filters.urgency !== null ||
    filters.priority !== null
  );
}

export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  options: { now?: Date; urgencyThresholdHours?: number } = {}
): Task[] {
  const query = filters.query.trim().toLowerCase();
  return tasks
    .filter((task) => {
      if (task.deletedAt) return false; // trash never appears in results
      // Explicit null checks: '' is a legal filter value (the default empty
      // subject) — truthiness would silently skip it while hasActiveFilters
      // reports a filter active.
      if (filters.category !== null && task.category !== filters.category) return false;
      if (filters.subject !== null && task.subject !== filters.subject) return false;
      if (filters.priority !== null) {
        if (filters.priority === 0 ? task.priority != null : task.priority !== filters.priority) {
          return false;
        }
      }
      // Urgency filtering implicitly excludes completed tasks (their status
      // is 'completed', which never equals an urgency level).
      if (filters.urgency && deriveStatus(task, options) !== filters.urgency) return false;
      if (
        query &&
        !task.title.toLowerCase().includes(query) &&
        !task.description.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER));
}
