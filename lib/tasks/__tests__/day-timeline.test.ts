import { layoutDayTimeline, type TimelineEventInput, type TimelineTaskInput } from '../day-timeline';

const CFG = { pxPerHour: 64, taskHeight: 46, taskGap: 6, minEventHeight: 28 };

function ev(overrides: Partial<TimelineEventInput> & { id: number }): TimelineEventInput {
  return {
    start: new Date('2026-09-09T09:00:00'),
    end: new Date('2026-09-09T10:00:00'),
    allDay: false,
    ...overrides,
  };
}

function task(overrides: Partial<TimelineTaskInput> & { id: number }): TimelineTaskInput {
  return { due: new Date('2026-09-09T12:00:00'), ...overrides };
}

describe('layoutDayTimeline', () => {
  it('always spans at least the business day and expands beyond it', () => {
    const inside = layoutDayTimeline(
      [ev({ id: 1, start: new Date('2026-09-09T08:30:00'), end: new Date('2026-09-09T09:20:00') })],
      [task({ id: 1, due: new Date('2026-09-09T16:45:00') })],
      CFG
    );
    // Content inside 8–18 keeps the stable business-day frame.
    expect(inside.startHour).toBe(8);
    expect(inside.endHour).toBe(18);
    expect(inside.height).toBe((18 - 8) * CFG.pxPerHour);

    const expanded = layoutDayTimeline(
      [ev({ id: 1, start: new Date('2026-09-09T06:15:00'), end: new Date('2026-09-09T07:00:00') })],
      [task({ id: 1, due: new Date('2026-09-09T21:30:00') })],
      CFG
    );
    expect(expanded.startHour).toBe(6);
    expect(expanded.endHour).toBe(22);
  });

  it('positions and sizes event blocks by their time range', () => {
    const layout = layoutDayTimeline(
      [ev({ id: 1, start: new Date('2026-09-09T09:30:00'), end: new Date('2026-09-09T10:30:00') })],
      [],
      CFG
    );
    const block = layout.events[0];
    expect(block.top).toBe((9.5 - layout.startHour) * CFG.pxPerHour);
    expect(block.height).toBe(CFG.pxPerHour); // one hour
    expect(block.col).toBe(0);
    expect(block.cols).toBe(1);
  });

  it('gives endless events a 30-minute visual block and enforces a floor', () => {
    const layout = layoutDayTimeline(
      [
        ev({ id: 1, end: null }),
        ev({ id: 2, start: new Date('2026-09-09T11:00:00'), end: new Date('2026-09-09T11:05:00') }),
      ],
      [],
      CFG
    );
    expect(layout.events[0].height).toBe(CFG.pxPerHour / 2);
    expect(layout.events[1].height).toBe(CFG.minEventHeight);
  });

  it('splits overlapping events into side-by-side columns', () => {
    const layout = layoutDayTimeline(
      [
        ev({ id: 1, start: new Date('2026-09-09T09:00:00'), end: new Date('2026-09-09T10:00:00') }),
        ev({ id: 2, start: new Date('2026-09-09T09:30:00'), end: new Date('2026-09-09T10:30:00') }),
        ev({ id: 3, start: new Date('2026-09-09T11:00:00'), end: new Date('2026-09-09T12:00:00') }),
      ],
      [],
      CFG
    );
    const [a, b, c] = layout.events;
    expect([a.col, b.col].sort()).toEqual([0, 1]);
    expect(a.cols).toBe(2);
    expect(b.cols).toBe(2);
    expect(c.cols).toBe(1); // the later event is alone again
  });

  it('anchors tasks to their due time and pushes colliding ones down', () => {
    const layout = layoutDayTimeline(
      [],
      [
        task({ id: 1, due: new Date('2026-09-09T09:00:00') }),
        task({ id: 2, due: new Date('2026-09-09T09:05:00') }), // would overlap #1
        task({ id: 3, due: new Date('2026-09-09T15:00:00') }),
      ],
      CFG
    );
    const [t1, t2, t3] = layout.tasks;
    expect(t1.top).toBe((9 - layout.startHour) * CFG.pxPerHour);
    expect(t2.top).toBe(t1.top + CFG.taskHeight + CFG.taskGap);
    expect(t3.top).toBe((15 - layout.startHour) * CFG.pxPerHour);
  });

  it('separates all-day events out of the timeline', () => {
    const layout = layoutDayTimeline(
      [ev({ id: 1, allDay: true }), ev({ id: 2 })],
      [],
      CFG
    );
    expect(layout.allDayIds).toEqual([1]);
    expect(layout.events.map((e) => e.id)).toEqual([2]);
  });

  it('produces sensible hour marks with 12-hour labels', () => {
    const layout = layoutDayTimeline([ev({ id: 1 })], [], CFG);
    expect(layout.hours[0]).toEqual({ hour: 8, top: 0, label: '8 AM' });
    const noon = layout.hours.find((h) => h.hour === 12);
    expect(noon?.label).toBe('12 PM');
  });

  it('handles the 11:59 PM default due time without falling off the bottom', () => {
    const layout = layoutDayTimeline(
      [],
      [task({ id: 1, due: new Date('2026-09-09T23:59:00') })],
      CFG
    );
    expect(layout.endHour).toBe(24);
    const t = layout.tasks[0];
    expect(t.top + CFG.taskHeight).toBeLessThanOrEqual(layout.height);
  });

  it('falls back to a business-day range when the day is empty', () => {
    const layout = layoutDayTimeline([], [], CFG);
    expect(layout.startHour).toBe(8);
    expect(layout.endHour).toBe(18);
  });
});
