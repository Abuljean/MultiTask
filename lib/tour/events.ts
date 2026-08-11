// Tiny event bus the interactive tour listens on. Mutations emit these so
// action steps ("swipe right to complete it") advance the moment the user
// actually does the thing. Module-level singleton — usable outside React.
export type TourEvent = 'task-created' | 'task-completed' | 'task-uncompleted' | 'task-deleted';

type Listener = (event: TourEvent) => void;

const listeners = new Set<Listener>();

export function emitTourEvent(event: TourEvent) {
  for (const listener of listeners) listener(event);
}

export function onTourEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
