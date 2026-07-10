// The Task domain model and its mapping to the Supabase `task` table.
// The table shape comes from the Java web app (reference/web-app-source/Task.java)
// plus supabase/02-user-uuid-and-policies.sql — snake_case columns, legacy ids.
// The app works with the camelCase `Task` type; the `TaskRow` type and the two
// mappers are the only place the raw table shape appears.

import { formatWallClock, parseWallClock } from './dates';

/** Raw row exactly as PostgREST returns it. */
export type TaskRow = {
  task_id: number;
  user_uuid: string | null;
  /** Legacy Java-app user key. The app never sets this — a DB trigger does. */
  user_id: number | null;
  title: string;
  description: string;
  /** timestamptz — a real instant, ISO string with offset. */
  creation_date: string;
  /** Wall-clock local datetime, NO timezone (by design — see dates.ts). */
  due_date: string | null;
  is_completed: boolean;
  subject: string | null;
  subject_color: string | null;
  category: string | null;
  category_color: string | null;
  priority: number | null;
  /** Soft-delete timestamp (trash). null/absent = live task. */
  deleted_at?: string | null;
};

export type Task = {
  id: number;
  title: string;
  description: string;
  createdAt: Date;
  /** Wall-clock deadline interpreted in the device's current timezone. */
  dueDate: Date | null;
  isCompleted: boolean;
  subject: string;
  subjectColor: string;
  category: string;
  categoryColor: string;
  /** Priority rank: 1 = "1st", 2 = "2nd", 3 = "3rd"; null = no priority. */
  priority: number | null;
  /** When non-null, the task is in the trash ("Deleted" section). */
  deletedAt: Date | null;
};

// Defaults mirror Task.java so both apps agree on what "unset" looks like.
export const DEFAULT_CATEGORY = 'Uncategorized';
export const DEFAULT_CATEGORY_COLOR = '#fef3c7';
export const DEFAULT_SUBJECT_COLOR = '#e5e7eb';

export function toTask(row: TaskRow): Task {
  return {
    id: row.task_id,
    title: row.title,
    description: row.description ?? '',
    createdAt: new Date(row.creation_date),
    dueDate: row.due_date ? parseWallClock(row.due_date) : null,
    isCompleted: row.is_completed,
    subject: row.subject ?? '',
    subjectColor: row.subject_color ?? DEFAULT_SUBJECT_COLOR,
    category: row.category ?? DEFAULT_CATEGORY,
    categoryColor: row.category_color ?? DEFAULT_CATEGORY_COLOR,
    priority: row.priority,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

/** Fields a client may set when creating a task. Everything else is defaulted
 *  by the database (id, creation_date) or filled by trigger (user_id). */
export type NewTask = {
  title: string;
  dueDate: Date | null;
  description?: string;
  category?: string;
  categoryColor?: string;
  subject?: string;
  subjectColor?: string;
  priority?: number | null;
};

/** Every user-editable field, all explicit — the edit form always knows the
 *  full desired state (unlike quick-add, where omissions mean DB defaults). */
export type TaskEdits = {
  title: string;
  dueDate: Date | null;
  description: string;
  priority: number | null;
  category: string;
  categoryColor: string;
  subject: string;
  subjectColor: string;
};

export function toUpdateRow(edits: TaskEdits): Partial<TaskRow> {
  return {
    title: edits.title,
    due_date: edits.dueDate ? formatWallClock(edits.dueDate) : null,
    description: edits.description,
    priority: edits.priority,
    category: edits.category,
    category_color: edits.categoryColor,
    subject: edits.subject,
    subject_color: edits.subjectColor,
  };
}

export function toInsertRow(input: NewTask, userUuid: string): Partial<TaskRow> {
  return {
    user_uuid: userUuid,
    title: input.title,
    due_date: input.dueDate ? formatWallClock(input.dueDate) : null,
    // Only include optional fields when provided — otherwise the DB defaults
    // (added in supabase/02) apply, keeping quick-add payloads minimal.
    ...(input.description !== undefined && { description: input.description }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.categoryColor !== undefined && { category_color: input.categoryColor }),
    ...(input.subject !== undefined && { subject: input.subject }),
    ...(input.subjectColor !== undefined && { subject_color: input.subjectColor }),
    ...(input.priority !== undefined && { priority: input.priority }),
  };
}
