import { buildSpotlightItems } from '../spotlight-items';
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

describe('buildSpotlightItems', () => {
  it('indexes open tasks only — completed and trashed stay out of search', () => {
    const items = buildSpotlightItems([
      task({ id: 1, title: 'Open' }),
      task({ id: 2, title: 'Done', isCompleted: true }),
      task({ id: 3, title: 'Trashed', deletedAt: new Date() }),
    ]);
    expect(items.map((i) => i.id)).toEqual([1]);
  });

  it('carries the card-idiom due label; dateless tasks get none', () => {
    const items = buildSpotlightItems([
      task({ id: 1, dueDate: new Date('2026-09-14T14:30:00') }),
      task({ id: 2, title: 'No date' }),
    ]);
    expect(items[0].due).toMatch(/Sep 14/);
    expect(items[1].due).toBeUndefined();
  });

  it('caps the index at 200 soonest-due items', () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      task({ id: i + 1, dueDate: new Date(2026, 8, 1 + (i % 28), 9) })
    );
    const items = buildSpotlightItems(many);
    expect(items).toHaveLength(200);
  });
});
