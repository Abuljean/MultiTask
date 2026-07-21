// Converts a parsed CSV row into a task, for the import flow's "make these
// tasks instead of events" option. Pure + tested; the batch insert lives in
// lib/tasks/use-tasks.ts (useImportTasks).
import type { NewTask } from '@/lib/tasks/types';
import type { ParsedEvent } from './csv';

export function eventToNewTask(event: ParsedEvent): NewTask {
  const parts: string[] = [];
  if (event.notes) parts.push(event.notes);
  if (event.location) parts.push(`Location: ${event.location}`);
  const description = parts.join('\n');

  // Timed rows keep their exact start as the due time. All-day rows have no
  // meaningful time, so they take the app's dateless-task convention — due at
  // 11:59 PM that day (same as quick-add) — rather than midnight, which would
  // read as instantly overdue.
  const dueDate = new Date(event.start);
  if (event.allDay) dueDate.setHours(23, 59, 0, 0);

  return {
    title: event.title,
    dueDate,
    ...(description ? { description } : {}),
  };
}
