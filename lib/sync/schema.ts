// PowerSync client-side schema — mirrors the Postgres tables that the sync
// rules publish (powersync/sync-rules.yaml). Column names match Postgres
// exactly; primary keys become the implicit client `id` column (text).
// This module is ONLY imported dynamically from lib/sync/system.ts — never
// statically — so Expo Go (which can't load the native SQLite adapter)
// never evaluates it.
import { column, Schema, Table } from '@powersync/react-native';

const task = new Table({
  user_uuid: column.text,
  user_id: column.integer,
  title: column.text,
  description: column.text,
  creation_date: column.text,
  due_date: column.text,
  is_completed: column.integer,
  subject: column.text,
  subject_color: column.text,
  category: column.text,
  category_color: column.text,
  priority: column.integer,
  deleted_at: column.text,
});

const recurring_task = new Table({
  user_uuid: column.text,
  title: column.text,
  sort_order: column.integer,
  created_at: column.text,
  archived_at: column.text,
});

const recurring_completion = new Table({
  recurring_task_id: column.integer,
  user_uuid: column.text,
  done_on: column.text,
});

const event = new Table({
  user_uuid: column.text,
  title: column.text,
  start_at: column.text,
  end_at: column.text,
  all_day: column.integer,
  location: column.text,
  notes: column.text,
  source: column.text,
  color: column.text,
  created_at: column.text,
});

export const AppSchema = new Schema({ task, recurring_task, recurring_completion, event });
