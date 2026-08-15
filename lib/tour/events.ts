// Tiny event bus the interactive tour listens on. UI code emits these so
// action steps advance the moment the user actually does the thing.
// Module-level singleton — usable outside React.
export type TourEvent =
  | 'task-created'
  | 'task-completed'
  | 'task-uncompleted'
  | 'task-deleted'
  | 'task-restored'
  | 'form-date-set'
  | 'form-priority-set'
  | 'form-category-set'
  | 'form-subject-set'
  | 'recurring-added'
  | 'recurring-checked';

type Listener = (event: TourEvent) => void;

const listeners = new Set<Listener>();

export function emitTourEvent(event: TourEvent) {
  for (const listener of listeners) listener(event);
}

export function onTourEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
