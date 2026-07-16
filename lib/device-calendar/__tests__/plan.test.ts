import { planCalendarEvents, taskEventMarker, markerTaskId } from '../plan';
import type { Task } from '@/lib/tasks/types';

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

const NOW = new Date('2026-07-16T12:00:00'); // wall-clock local

describe('planCalendarEvents', () => {
  it('creates one 30-minute event per qualifying task', () => {
    const due = new Date('2026-07-20T15:00:00');
    const events = planCalendarEvents([task({ id: 7, title: 'Dentist forms', dueDate: due })], NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ taskId: 7, title: 'Dentist forms' });
    expect(events[0].startDate.getTime()).toBe(due.getTime());
    expect(events[0].endDate.getTime() - events[0].startDate.getTime()).toBe(30 * 60 * 1000);
    expect(events[0].notes).toBe('multitask:7');
  });

  it('skips completed, deleted, and dateless tasks', () => {
    const due = new Date('2026-07-20T15:00:00');
    const events = planCalendarEvents(
      [
        task({ id: 1, dueDate: due, isCompleted: true }),
        task({ id: 2, dueDate: due, deletedAt: new Date() }),
        task({ id: 3, dueDate: null }),
        task({ id: 4, dueDate: due }),
      ],
      NOW
    );
    expect(events.map((e) => e.taskId)).toEqual([4]);
  });

  it('includes tasks due earlier TODAY but not older overdue ones', () => {
    const events = planCalendarEvents(
      [
        task({ id: 1, dueDate: new Date('2026-07-16T08:00:00') }), // this morning
        task({ id: 2, dueDate: new Date('2026-07-15T23:59:00') }), // yesterday
      ],
      NOW
    );
    expect(events.map((e) => e.taskId)).toEqual([1]);
  });

  it('caps the window at 90 days out', () => {
    const events = planCalendarEvents(
      [
        task({ id: 1, dueDate: new Date('2026-10-13T12:00:00') }), // ~89 days
        task({ id: 2, dueDate: new Date('2026-10-20T12:00:00') }), // ~96 days
      ],
      NOW
    );
    expect(events.map((e) => e.taskId)).toEqual([1]);
  });

  it('sorts deterministically by due time then id', () => {
    const at = new Date('2026-07-18T09:00:00');
    const events = planCalendarEvents(
      [
        task({ id: 5, dueDate: new Date('2026-07-19T09:00:00') }),
        task({ id: 9, dueDate: at }),
        task({ id: 2, dueDate: at }),
      ],
      NOW
    );
    expect(events.map((e) => e.taskId)).toEqual([2, 9, 5]);
  });
});

describe('markers', () => {
  it('round-trips a task id through the notes marker', () => {
    expect(taskEventMarker(42)).toBe('multitask:42');
    expect(markerTaskId('multitask:42')).toBe(42);
    expect(markerTaskId('multitask:42\nextra')).toBe(42);
  });

  it('rejects notes that are not ours', () => {
    expect(markerTaskId('someone elses event')).toBeNull();
    expect(markerTaskId('')).toBeNull();
    expect(markerTaskId(null)).toBeNull();
    expect(markerTaskId('multitask:not-a-number')).toBeNull();
  });
});
