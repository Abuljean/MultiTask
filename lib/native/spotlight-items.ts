// Pure mapper: tasks → Spotlight index entries. Open tasks only (system
// search should never resurface completed/trashed work), soonest-due first,
// capped to keep the index light.
import { formatDueDate } from '@/lib/tasks/dates';
import type { Task } from '@/lib/tasks/types';
import type { SpotlightTask } from '@/modules/multitask-native';

const CAP = 200;

export function buildSpotlightItems(tasks: Task[]): SpotlightTask[] {
  return tasks
    .filter((t) => !t.isCompleted && !t.deletedAt)
    .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity) || a.id - b.id)
    .slice(0, CAP)
    .map((t) => ({
      id: t.id,
      title: t.title,
      ...(t.dueDate ? { due: formatDueDate(t.dueDate) } : {}),
    }));
}
