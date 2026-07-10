import { EMPTY_FILTERS, filterTasks, hasActiveFilters } from '../filter';
import { addHours } from '../dates';
import type { Task } from '../types';

const NOW = new Date(2026, 6, 15, 12, 0, 0);

let nextId = 1;
function task(overrides: Partial<Task>): Task {
  return {
    id: nextId++,
    title: 't',
    description: '',
    createdAt: NOW,
    dueDate: null,
    isCompleted: false,
    subject: '',
    subjectColor: '#e5e7eb',
    category: 'Uncategorized',
    categoryColor: '#fef3c7',
    priority: null,
    deletedAt: null,
    ...overrides,
  };
}

describe('filterTasks', () => {
  const tasks = [
    task({ title: 'Buy milk', category: 'Errands', subject: 'Home' }),
    task({ title: 'Physics homework', category: 'School', subject: 'Physics', dueDate: addHours(NOW, 2) }),
    task({ title: 'Old essay', category: 'School', dueDate: addHours(NOW, -5) }),
    task({ title: 'Trashed', category: 'School', deletedAt: NOW }),
    task({ title: 'Done milk run', category: 'Errands', isCompleted: true }),
  ];

  test('text search matches title case-insensitively, excludes trash', () => {
    const result = filterTasks(tasks, { ...EMPTY_FILTERS, query: 'MILK' }, { now: NOW });
    expect(result.map((t) => t.title)).toEqual(['Buy milk', 'Done milk run']);
  });

  test('category filter hides everything else (earliest due first)', () => {
    const result = filterTasks(tasks, { ...EMPTY_FILTERS, category: 'School' }, { now: NOW });
    expect(result.map((t) => t.title)).toEqual(['Old essay', 'Physics homework']);
  });

  test('urgency filter matches derived status and excludes completed', () => {
    const urgent = filterTasks(tasks, { ...EMPTY_FILTERS, urgency: 'urgent' }, { now: NOW });
    expect(urgent.map((t) => t.title)).toEqual(['Physics homework']);
    const overdue = filterTasks(tasks, { ...EMPTY_FILTERS, urgency: 'overdue' }, { now: NOW });
    expect(overdue.map((t) => t.title)).toEqual(['Old essay']);
  });

  test('filters combine with AND', () => {
    const result = filterTasks(
      tasks,
      { ...EMPTY_FILTERS, category: 'School', query: 'physics' },
      { now: NOW }
    );
    expect(result.map((t) => t.title)).toEqual(['Physics homework']);
  });

  test('results sort by due date, dateless last', () => {
    const result = filterTasks(tasks, { ...EMPTY_FILTERS, category: 'Errands' }, { now: NOW });
    expect(result.map((t) => t.title)).toEqual(['Buy milk', 'Done milk run']);
  });
});

describe('hasActiveFilters', () => {
  test('empty means inactive; whitespace query means inactive', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, urgency: 'urgent' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'a' })).toBe(true);
  });
});
