import { buildMonthMatrix, localDateKey, parseDateKey, tasksByDay } from '../calendar';
import type { Task } from '../types';

let nextId = 1;
function task(overrides: Partial<Task>): Task {
  return {
    id: nextId++,
    title: 't',
    description: '',
    createdAt: new Date(2026, 0, 1),
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

describe('buildMonthMatrix', () => {
  test('July 2026 (starts Wednesday, 31 days) lays out into 5 weeks', () => {
    const weeks = buildMonthMatrix(2026, 6);
    expect(weeks).toHaveLength(5);
    // First week: Sun/Mon/Tue blank, then the 1st on Wednesday.
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]?.getDate()).toBe(1);
    // Last day is the 31st (Friday), trailing Saturday blank.
    expect(weeks[4][5]?.getDate()).toBe(31);
    expect(weeks[4][6]).toBeNull();
  });

  test('February 2027 (starts Monday, 28 days) fits exactly 4 weeks + leading blank', () => {
    const weeks = buildMonthMatrix(2027, 1);
    expect(weeks.flat().filter(Boolean)).toHaveLength(28);
    expect(weeks[0][0]).toBeNull(); // Sunday blank
    expect(weeks[0][1]?.getDate()).toBe(1); // Monday the 1st
  });

  test('alwaysSixWeeks pads every month to 6 rows', () => {
    expect(buildMonthMatrix(2026, 6, true)).toHaveLength(6); // naturally 5
    expect(buildMonthMatrix(2027, 1, true)).toHaveLength(6); // naturally 5 (28 days + 1 blank)
    expect(buildMonthMatrix(2026, 7, true)).toHaveLength(6); // Aug 2026 naturally 6
    expect(buildMonthMatrix(2026, 6, true).flat().filter(Boolean)).toHaveLength(31);
  });

  test('every week has exactly 7 cells', () => {
    for (const [y, m] of [
      [2026, 0],
      [2026, 11],
      [2028, 1], // leap February
    ]) {
      for (const week of buildMonthMatrix(y, m)) {
        expect(week).toHaveLength(7);
      }
    }
  });
});

describe('date keys', () => {
  test('round-trip preserves the calendar day', () => {
    const d = new Date(2026, 6, 9);
    expect(localDateKey(d)).toBe('2026-07-09');
    expect(parseDateKey('2026-07-09').getTime()).toBe(d.getTime());
  });
});

describe('tasksByDay', () => {
  test('groups by local day, excludes deleted and dateless, sorts by time', () => {
    const byDay = tasksByDay([
      task({ title: 'evening', dueDate: new Date(2026, 6, 9, 18, 0) }),
      task({ title: 'morning', dueDate: new Date(2026, 6, 9, 9, 0) }),
      task({ title: 'other-day', dueDate: new Date(2026, 6, 10, 9, 0) }),
      task({ title: 'trashed', dueDate: new Date(2026, 6, 9, 9, 0), deletedAt: new Date() }),
      task({ title: 'dateless' }),
    ]);
    expect(byDay.get('2026-07-09')?.map((t) => t.title)).toEqual(['morning', 'evening']);
    expect(byDay.get('2026-07-10')?.map((t) => t.title)).toEqual(['other-day']);
    expect(byDay.size).toBe(2);
  });
});
