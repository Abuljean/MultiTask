-- 09-powersync-prep.sql
-- Run ONCE in the Supabase SQL Editor. Prepares the database for PowerSync
-- (Stage 3 offline sync). Two parts:
--
-- A. recurring_completion gets a single-column primary key. PowerSync
--    requires exactly one PK column per synced table (it becomes the
--    client-side row id), and this table had a composite PK. The old
--    uniqueness (one completion per task per day) survives as a UNIQUE
--    constraint, so app behavior is unchanged.
--
-- B. A logical-replication PUBLICATION named "powersync" covering the
--    synced tables — this is how PowerSync's service receives changes.
--    The publication alone changes nothing about how the app or web app
--    work today.

-- ========================================================================
-- A. Surrogate key for recurring_completion
-- ========================================================================
alter table public.recurring_completion
  drop constraint if exists recurring_completion_pkey;

alter table public.recurring_completion
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.recurring_completion
  add primary key (id);

alter table public.recurring_completion
  add constraint recurring_completion_task_day_unique unique (recurring_task_id, done_on);

-- ========================================================================
-- B. The PowerSync publication
-- ========================================================================
create publication powersync for table
  public.task,
  public.recurring_task,
  public.recurring_completion,
  public.event;

-- Sanity check (read-only) — expect 4 rows:
--   select tablename from pg_publication_tables where pubname = 'powersync';
