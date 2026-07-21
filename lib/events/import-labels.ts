// User-facing strings for the CSV import's events/tasks split. Pulled out of
// the screen so the count + pluralization logic (0 / 1 / many, mixed) is unit
// testable without the file picker.

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** The import button, reflecting how the parsed rows are currently split. */
export function importButtonLabel(eventCount: number, taskCount: number): string {
  if (taskCount === 0) return `Import ${plural(eventCount, 'event')}`;
  if (eventCount === 0) return `Import ${plural(taskCount, 'task')}`;
  return `Import ${plural(eventCount, 'event')}, ${plural(taskCount, 'task')}`;
}

/** The success toast after import. */
export function importedMessage(eventCount: number, taskCount: number): string {
  if (taskCount === 0) return `${plural(eventCount, 'event')} imported.`;
  if (eventCount === 0) return `${plural(taskCount, 'task')} imported.`;
  return `${plural(eventCount, 'event')} and ${plural(taskCount, 'task')} imported.`;
}
