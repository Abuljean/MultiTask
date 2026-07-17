import { buildWidgetSnapshot } from '../snapshot-data';
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

const NOW = new Date('2026-07-17T12:00:00');

describe('buildWidgetSnapshot', () => {
  it('lists open tasks due today plus all overdue, overdue first', () => {
    const snapshot = buildWidgetSnapshot(
      [
        task({ id: 1, title: 'Later today', dueDate: new Date('2026-07-17T20:00:00') }),
        task({ id: 2, title: 'Old overdue', dueDate: new Date('2026-07-15T10:00:00') }),
        task({ id: 3, title: 'Done today', dueDate: new Date('2026-07-17T18:00:00'), isCompleted: true }),
        task({ id: 4, title: 'In trash', dueDate: new Date('2026-07-17T18:00:00'), deletedAt: new Date() }),
        task({ id: 5, title: 'Tomorrow', dueDate: new Date('2026-07-18T09:00:00') }),
      ],
      NOW,
      48
    );
    expect(snapshot.today.map((t) => t.id)).toEqual([2, 1]);
    expect(snapshot.today[0].status).toBe('overdue');
    expect(snapshot.next).toBeNull(); // today has content — no "next" fallback
  });

  it('falls back to the single next upcoming task when today is empty', () => {
    const snapshot = buildWidgetSnapshot(
      [
        task({ id: 5, title: 'Friday thing', dueDate: new Date('2026-07-18T09:00:00') }),
        task({ id: 6, title: 'Next week', dueDate: new Date('2026-07-21T09:00:00') }),
        task({ id: 7, title: 'No date' }),
      ],
      NOW,
      48
    );
    expect(snapshot.today).toEqual([]);
    expect(snapshot.next?.id).toBe(5);
    expect(snapshot.next?.status).toBe('urgent'); // due within 48h
  });

  it('formats due labels in the card idiom and dates the snapshot', () => {
    const snapshot = buildWidgetSnapshot(
      [task({ id: 1, dueDate: new Date('2026-07-17T15:30:00') })],
      NOW,
      48
    );
    expect(snapshot.dateLabel).toBe('Fri, Jul 17');
    expect(snapshot.today[0].dueLabel).toBe('3:30 PM');
  });

  it('labels overdue-from-earlier-days with the date, not just a time', () => {
    const snapshot = buildWidgetSnapshot(
      [task({ id: 1, dueDate: new Date('2026-07-15T09:00:00') })],
      NOW,
      48
    );
    expect(snapshot.today[0].dueLabel).toBe('Wed, Jul 15');
  });

  it('caps the today list at 6 entries', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      task({ id: i + 1, dueDate: new Date(`2026-07-17T${String(13 + i).padStart(2, '0')}:00:00`) })
    );
    const snapshot = buildWidgetSnapshot(many, NOW, 48);
    expect(snapshot.today).toHaveLength(6);
    expect(snapshot.openCount).toBe(10);
  });
});
