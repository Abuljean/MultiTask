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
-- Guarded (2026-07-15 audit): an accidental RE-RUN of the unguarded version
-- would drop the NEW primary key (the `if exists` matches its default name)
-- and then die on the duplicate unique constraint — leaving the table with
-- NO PK, which silently breaks PowerSync replication. The do-block makes the
-- whole step a no-op once the surrogate key exists.
do $$
begin
  -- Each step checked independently, so a partially-applied earlier run
  -- (e.g. id column added but PK lost) gets REPAIRED, not skipped.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recurring_completion'
      and column_name = 'id'
  ) then
    alter table public.recurring_completion
      drop constraint if exists recurring_completion_pkey;
    alter table public.recurring_completion
      add column id uuid not null default gen_random_uuid();
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recurring_completion'::regclass and contype = 'p'
  ) then
    alter table public.recurring_completion add primary key (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recurring_completion_task_day_unique'
  ) then
    alter table public.recurring_completion
      add constraint recurring_completion_task_day_unique unique (recurring_task_id, done_on);
  end if;
end $$;

-- ========================================================================
-- B. The PowerSync publication
-- ========================================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'powersync') then
    create publication powersync for table
      public.task,
      public.recurring_task,
      public.recurring_completion,
      public.event;
  else
    -- Reconcile membership: an existing-but-incomplete publication would
    -- silently leave tables out of replication.
    alter publication powersync set table
      public.task,
      public.recurring_task,
      public.recurring_completion,
      public.event;
  end if;
end $$;

-- Sanity check (read-only) — expect 4 rows:
--   select tablename from pg_publication_tables where pubname = 'powersync';
