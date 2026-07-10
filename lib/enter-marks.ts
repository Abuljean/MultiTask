// Entrance bookkeeping for the task list: right before a mutation moves a
// task to another group (or creates one), the initiator marks which side the
// card should slide in from. SwipeableTaskCard consumes the mark when it
// renders. Module-level singleton so both the list screen and the quick-add
// route can mark arrivals. Marks expire so a section expanded much later
// doesn't animate stale arrivals.

type Side = 'left' | 'right';

const marks = new Map<number, { from: Side; at: number }>();
const TTL_MS = 1500;

export function markEnter(id: number, from: Side) {
  marks.set(id, { from, at: Date.now() });
}

export function getEnterFrom(id: number): Side | null {
  const mark = marks.get(id);
  if (!mark) return null;
  if (Date.now() - mark.at > TTL_MS) {
    marks.delete(id);
    return null;
  }
  return mark.from;
}

export function clearEnterMark(id: number) {
  marks.delete(id);
}
