import { eventToNewTask } from '../to-task';
import type { ParsedEvent } from '../csv';

function event(overrides: Partial<ParsedEvent>): ParsedEvent {
  return {
    title: 'Study group',
    start: new Date('2026-09-14T09:00:00'),
    end: null,
    allDay: false,
    location: null,
    notes: null,
    color: null,
    ...overrides,
  };
}

describe('eventToNewTask', () => {
  it('keeps a timed event’s start as the due time', () => {
    const t = eventToNewTask(event({ start: new Date('2026-09-14T14:30:00') }));
    expect(t.title).toBe('Study group');
    expect(t.dueDate?.getTime()).toBe(new Date('2026-09-14T14:30:00').getTime());
    expect(t.description).toBeUndefined();
  });

  it('gives all-day events the 11:59 PM dateless-task convention', () => {
    const t = eventToNewTask(event({ allDay: true, start: new Date('2026-09-14T00:00:00') }));
    const due = t.dueDate as Date;
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(8);
    expect(due.getDate()).toBe(14);
    expect(due.getHours()).toBe(23);
    expect(due.getMinutes()).toBe(59);
  });

  it('folds notes and location into the description', () => {
    const t = eventToNewTask(event({ notes: 'Bring the lab manual', location: 'Room 12' }));
    expect(t.description).toBe('Bring the lab manual\nLocation: Room 12');
  });

  it('uses location alone when there are no notes', () => {
    const t = eventToNewTask(event({ location: 'Library' }));
    expect(t.description).toBe('Location: Library');
  });

  it('omits an empty description rather than sending a blank string', () => {
    const t = eventToNewTask(event({ notes: null, location: null }));
    expect(t.description).toBeUndefined();
  });

  it('does not mutate the source event', () => {
    const src = event({ allDay: true, start: new Date('2026-09-14T00:00:00') });
    eventToNewTask(src);
    expect(src.start.getHours()).toBe(0);
  });
});
