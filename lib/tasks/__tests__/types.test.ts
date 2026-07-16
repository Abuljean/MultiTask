// The row mappers are the REST ↔ SQLite ↔ UI contract; toInsertRow's
// omit-when-unset semantics decide whether the DB defaults apply.
import {
  DEFAULT_CATEGORY,
  DEFAULT_CATEGORY_COLOR,
  toInsertRow,
  toTask,
  toTaskFromSqlite,
  type TaskRow,
  type TaskSqliteRow,
} from '../types';

const restRow: TaskRow = {
  task_id: 42,
  title: 'Write tests',
  description: 'the mappers',
  creation_date: '2026-07-10T09:00:00',
  due_date: '2026-07-11T23:59:00',
  is_completed: false,
  subject: 'infra',
  subject_color: '#e5e7eb',
  category: 'Work',
  category_color: '#fef3c7',
  priority: 1,
  user_id: null,
  user_uuid: 'abc',
  deleted_at: null,
};

describe('toTask (REST)', () => {
  it('maps ids, wall-clock dates, and nullables', () => {
    const task = toTask(restRow);
    expect(task.id).toBe(42);
    expect(task.dueDate?.getHours()).toBe(23);
    expect(task.dueDate?.getMinutes()).toBe(59);
    expect(task.deletedAt).toBeNull();
    expect(task.priority).toBe(1);
  });

  it('null due date stays null', () => {
    expect(toTask({ ...restRow, due_date: null }).dueDate).toBeNull();
  });
});

describe('toTaskFromSqlite', () => {
  const sqliteRow: TaskSqliteRow = {
    id: '42',
    title: 'Write tests',
    description: 'the mappers',
    creation_date: '2026-07-10T09:00:00',
    due_date: '2026-07-11T23:59:00',
    is_completed: 1,
    subject: 'infra',
    subject_color: '#e5e7eb',
    category: 'Work',
    category_color: '#fef3c7',
    priority: 1,
    deleted_at: null,
  };

  it('coerces text id and integer boolean', () => {
    const task = toTaskFromSqlite(sqliteRow);
    expect(task.id).toBe(42);
    expect(task.isCompleted).toBe(true);
  });

  it('round-trips with the REST mapper on shared fields', () => {
    const a = toTask(restRow);
    const b = toTaskFromSqlite({ ...sqliteRow, is_completed: 0 });
    expect(b.title).toBe(a.title);
    expect(b.dueDate?.getTime()).toBe(a.dueDate?.getTime());
    expect(b.category).toBe(a.category);
  });
});

describe('toInsertRow', () => {
  it('omits unset optional fields so DB defaults apply', () => {
    const row = toInsertRow({ title: 'Quick add', dueDate: null }, 'uuid-1');
    expect(row.title).toBe('Quick add');
    expect(row.user_uuid).toBe('uuid-1');
    expect('description' in row ? row.description : undefined).toBeUndefined();
    expect('category' in row ? row.category : undefined).toBeUndefined();
  });

  it('serializes due dates as wall-clock, never ISO/UTC', () => {
    const due = new Date(2026, 6, 11, 23, 59, 0);
    const row = toInsertRow({ title: 't', dueDate: due }, 'uuid-1');
    expect(row.due_date).toBe('2026-07-11T23:59:00');
  });

  it('passes explicit values through', () => {
    const row = toInsertRow(
      { title: 't', dueDate: null, category: DEFAULT_CATEGORY, categoryColor: DEFAULT_CATEGORY_COLOR },
      'uuid-1'
    );
    expect(row.category).toBe(DEFAULT_CATEGORY);
    expect(row.category_color).toBe(DEFAULT_CATEGORY_COLOR);
  });
});
