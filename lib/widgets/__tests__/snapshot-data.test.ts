import { buildWidgetSnapshot } from '../snapshot-data';
import type { Task } from '@/lib/tasks/types';
import type { CalendarEvent } from '@/lib/events/use-events';

function task(overrides: Partial<Task>): Task {
  return {
    id: 1,
    title: 'A task',
    description: null,
    dueDate: null,
    creationDate: new Date('2026-07-01T10:00:00'),
    isCompleted: false,
    subject: null,
    subjectColor: null,
    category: null,
    categoryColor: null,
    priority: null,
    deletedAt: null,
    ...overrides,
  } as Task;
}

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    title: 'An event',
    start: new Date('2026-07-17T09:00:00'),
    end: null,
    allDay: false,
    location: null,
    notes: null,
    source: null,
    color: null,
    ...overrides,
  };
}

const NOW = new Date('2026-07-17T12:00:00');

describe('buildWidgetSnapshot — tasks', () => {
  it('lists open tasks due today plus overdue, overdue first', () => {
    const s = buildWidgetSnapshot(
      [
        task({ id: 1, title: 'Later today', dueDate: new Date('2026-07-17T20:00:00') }),
        task({ id: 2, title: 'Old overdue', dueDate: new Date('2026-07-15T10:00:00') }),
        task({ id: 5, title: 'Tomorrow', dueDate: new Date('2026-07-18T09:00:00') }),
      ],
      [],
      NOW,
      48
    );
    expect(s.today.map((t) => t.id)).toEqual([2, 1]);
    expect(s.today[0].status).toBe('overdue');
    expect(s.today.every((t) => t.done === false)).toBe(true);
    expect(s.openCount).toBe(2);
  });

  it('includes completed tasks (due today/overdue) after the open ones, marked done', () => {
    const s = buildWidgetSnapshot(
      [
        task({ id: 1, title: 'Open today', dueDate: new Date('2026-07-17T20:00:00') }),
        task({ id: 3, title: 'Done today', dueDate: new Date('2026-07-17T09:00:00'), isCompleted: true }),
        task({ id: 4, title: 'Trashed', dueDate: new Date('2026-07-17T09:00:00'), deletedAt: new Date() }),
      ],
      [],
      NOW,
      48
    );
    expect(s.today.map((t) => t.id)).toEqual([1, 3]); // open first, then done; trashed excluded
    expect(s.today[1].done).toBe(true);
    expect(s.openCount).toBe(1); // done tasks don't count toward "open"
  });
});

describe('buildWidgetSnapshot — events', () => {
  it("includes today's events with a time label, sorted, distinct from tasks", () => {
    const s = buildWidgetSnapshot(
      [],
      [
        event({ id: 1, title: 'Standup', start: new Date('2026-07-17T09:00:00') }),
        event({ id: 2, title: 'Lunch', start: new Date('2026-07-17T12:30:00') }),
        event({ id: 3, title: 'Tomorrow thing', start: new Date('2026-07-18T09:00:00') }),
      ],
      NOW,
      48
    );
    expect(s.events.map((e) => e.id)).toEqual([1, 2]);
    expect(s.events[0].timeLabel).toBe('9:00 AM');
  });

  it('labels all-day events', () => {
    const s = buildWidgetSnapshot(
      [],
      [event({ id: 1, allDay: true, start: new Date('2026-07-17T00:00:00') })],
      NOW,
      48
    );
    expect(s.events[0].timeLabel).toBe('All day');
  });
});

describe('buildWidgetSnapshot — small-widget fallback', () => {
  it('is null when there are open tasks due today', () => {
    const s = buildWidgetSnapshot(
      [task({ id: 1, dueDate: new Date('2026-07-17T20:00:00') })],
      [],
      NOW,
      48
    );
    expect(s.fallback).toBeNull();
  });

  it('counts upcoming urgent tasks when nothing is due today', () => {
    const s = buildWidgetSnapshot(
      [
        task({ id: 1, title: 'Due in 30h', dueDate: new Date('2026-07-18T18:00:00') }), // within 48h
        task({ id: 2, title: 'Due in 40h', dueDate: new Date('2026-07-19T04:00:00') }), // within 48h
        task({ id: 3, title: 'Far off', dueDate: new Date('2026-07-30T09:00:00') }),
      ],
      [],
      NOW,
      48
    );
    expect(s.fallback).toEqual({
      kind: 'urgent',
      count: 2,
      title: 'Due in 30h',
      dueLabel: expect.stringMatching(/Jul 18/),
    });
  });

  it('groups upcoming by week once the urgent ones are past — nearest bucket', () => {
    const s = buildWidgetSnapshot(
      [
        task({ id: 1, title: 'A on the 25th', dueDate: new Date('2026-07-25T09:00:00') }),
        task({ id: 2, title: 'B on the 25th', dueDate: new Date('2026-07-25T15:00:00') }),
        task({ id: 3, title: 'C on the 27th', dueDate: new Date('2026-07-27T09:00:00') }),
      ],
      [],
      NOW,
      48
    );
    // Jul 25 is next week (idx 1); Jul 27 is the week after. Nearest = next week.
    expect(s.fallback).toEqual({
      kind: 'week',
      label: 'Next week',
      count: 2,
      title: 'A on the 25th',
      dueLabel: expect.stringMatching(/Sat, Jul 25/),
    });
  });

  it('counts upcoming events in the week bucket, not just tasks', () => {
    const s = buildWidgetSnapshot(
      [task({ id: 1, title: 'Task 25th', dueDate: new Date('2026-07-25T09:00:00') })],
      [event({ id: 9, title: 'Concert 24th', start: new Date('2026-07-24T19:00:00') })],
      NOW,
      48
    );
    // Both fall in the same week; the earliest (the event) titles it.
    expect(s.fallback).toMatchObject({ kind: 'week', label: 'Next week', count: 2, title: 'Concert 24th' });
  });

  it('reports clear when there is nothing ahead', () => {
    const s = buildWidgetSnapshot([task({ id: 1, dueDate: null })], [], NOW, 48);
    expect(s.fallback).toEqual({ kind: 'clear' });
  });
});

describe('buildWidgetSnapshot — labels & meta', () => {
  it('dates the snapshot and labels same-day due times vs overdue dates', () => {
    const s = buildWidgetSnapshot(
      [
        task({ id: 1, dueDate: new Date('2026-07-17T15:30:00') }),
        task({ id: 2, dueDate: new Date('2026-07-15T09:00:00') }),
      ],
      [],
      NOW,
      48
    );
    expect(s.dateLabel).toBe('Fri, Jul 17');
    const today = s.today.find((t) => t.id === 1);
    const overdue = s.today.find((t) => t.id === 2);
    expect(today?.dueLabel).toBe('3:30 PM');
    expect(overdue?.dueLabel).toBe('Wed, Jul 15');
  });
});
