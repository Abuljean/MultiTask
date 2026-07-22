// Pure layout engine for the day page's timeline (developer request
// 2026-07-22): events on the LEFT as duration-sized blocks, tasks on the
// RIGHT as fixed-height rows anchored to their due time. All geometry is
// computed here so it's unit-testable; the screen just renders rectangles.

export type TimelineEventInput = {
  id: number;
  start: Date;
  end: Date | null;
  allDay: boolean;
};

export type TimelineTaskInput = {
  id: number;
  due: Date;
};

export type TimelineConfig = {
  pxPerHour: number;
  /** Fixed height of a task row — tasks stay uniform and neat. */
  taskHeight: number;
  /** Vertical gap when a task row is pushed below a colliding one. */
  taskGap: number;
  /** Floor for very short events so their title stays readable. */
  minEventHeight: number;
};

export type TimelineLayout = {
  startHour: number;
  endHour: number;
  height: number;
  hours: { hour: number; top: number; label: string }[];
  events: { id: number; top: number; height: number; col: number; cols: number }[];
  tasks: { id: number; top: number }[];
  /** All-day events don't belong on an hour axis — strip above the timeline. */
  allDayIds: number[];
};

const DEFAULT_EVENT_MINUTES = 30; // endless events get a visual half-hour
const EMPTY_DAY_START = 8;
const EMPTY_DAY_END = 18;

function hourOf(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

export function hourLabel(hour: number): string {
  const h = hour % 24;
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function layoutDayTimeline(
  events: TimelineEventInput[],
  tasks: TimelineTaskInput[],
  config: TimelineConfig
): TimelineLayout {
  const allDayIds = events.filter((e) => e.allDay).map((e) => e.id);
  const timed = events
    .filter((e) => !e.allDay)
    .map((e) => {
      const startH = hourOf(e.start);
      const endH = e.end && e.end > e.start ? hourOf(e.end) : startH + DEFAULT_EVENT_MINUTES / 60;
      return { id: e.id, startH, endH };
    })
    .sort((a, b) => a.startH - b.startH || a.endH - b.endH || a.id - b.id);
  const dated = tasks
    .map((t) => ({ id: t.id, dueH: hourOf(t.due) }))
    .sort((a, b) => a.dueH - b.dueH || a.id - b.id);

  // Whole-hour range covering everything (empty day = business hours).
  const starts = [...timed.map((e) => e.startH), ...dated.map((t) => t.dueH)];
  const ends = [...timed.map((e) => e.endH), ...dated.map((t) => t.dueH)];
  const startHour =
    starts.length === 0 ? EMPTY_DAY_START : Math.min(EMPTY_DAY_START, Math.floor(Math.min(...starts)));
  const endHour =
    ends.length === 0 ? EMPTY_DAY_END : Math.max(EMPTY_DAY_END, Math.min(24, Math.ceil(Math.max(...ends))));
  const toY = (hour: number) => (hour - startHour) * config.pxPerHour;
  const height = toY(endHour);

  // Overlapping events split into side-by-side columns (classic day-view
  // algorithm): greedy column assignment inside each overlap cluster, and
  // every member of a cluster shares the cluster's column count.
  type Placed = { id: number; startH: number; endH: number; col: number; cluster: number };
  const placed: Placed[] = [];
  const columnEnds: number[] = []; // per-column latest endH, current cluster only
  let cluster = 0;
  let clusterEnd = -Infinity;
  const clusterCols = new Map<number, number>();
  for (const e of timed) {
    if (e.startH >= clusterEnd) {
      cluster += 1;
      columnEnds.length = 0;
      clusterEnd = -Infinity;
    }
    let col = columnEnds.findIndex((end) => end <= e.startH);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(e.endH);
    } else {
      columnEnds[col] = e.endH;
    }
    clusterEnd = Math.max(clusterEnd, e.endH);
    clusterCols.set(cluster, Math.max(clusterCols.get(cluster) ?? 1, columnEnds.length));
    placed.push({ id: e.id, startH: e.startH, endH: e.endH, col, cluster });
  }
  const eventBlocks = placed.map((e) => ({
    id: e.id,
    top: toY(e.startH),
    height: Math.max(config.minEventHeight, toY(e.endH) - toY(e.startH)),
    col: e.col,
    cols: clusterCols.get(e.cluster) ?? 1,
  }));

  // Tasks: anchored to their due time, pushed down just enough to never
  // overlap the previous row (uniform height keeps the column tidy).
  const taskBlocks: { id: number; top: number }[] = [];
  let prevBottom = -Infinity;
  for (const t of dated) {
    const ideal = Math.min(toY(t.dueH), height - config.taskHeight);
    const top = Math.max(ideal, prevBottom);
    taskBlocks.push({ id: t.id, top });
    prevBottom = top + config.taskHeight + config.taskGap;
  }

  const hours: TimelineLayout['hours'] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push({ hour: h, top: toY(h), label: hourLabel(h) });
  }

  return { startHour, endHour, height, hours, events: eventBlocks, tasks: taskBlocks, allDayIds };
}
