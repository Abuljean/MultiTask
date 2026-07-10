-- 04-soft-delete.sql
-- Run ONCE in the Supabase SQL Editor, BEFORE updating the app past commit
-- 3fd6cb8. Adds trash semantics: swiping a task away in the native app now
-- sets deleted_at instead of removing the row. The app shows these in a
-- collapsed "Deleted" section (restore or permanently delete from there),
-- and trash syncs across devices because it lives in the database.
--
-- KNOWN TRADEOFF (accepted 2026-07-09): the Vaadin web app does not know
-- about deleted_at, so soft-deleted tasks still appear on the website until
-- the web redesign phase. Deletes made ON the web remain hard deletes.

alter table public.task
  add column if not exists deleted_at timestamptz;

-- Partial index: nearly all queries want live tasks; deleted rows are rare.
create index if not exists task_deleted_at_idx on public.task (deleted_at) where deleted_at is not null;
