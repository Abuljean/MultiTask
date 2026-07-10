-- 02-user-uuid-and-policies.sql
-- The core Stage 1 migration. Run ONCE in the Supabase SQL Editor, after 01.
-- Written against the schema inspected on 2026-07-09 (12 users, 19 tasks).
--
-- What it does, in order:
--   A. Adds a `user_uuid` column to task — the Supabase Auth identity. The old
--      bigint `user_id` stays, so the Java web app keeps working unchanged.
--   B. Makes `task` insertable by the native app: ID default from the shared
--      Hibernate sequence, and defaults matching the Java entity's defaults.
--   C. Grants + RLS policies: logged-in users can CRUD only their own rows.
--   D. A trigger that cross-fills user_id/user_uuid on insert (matched by
--      email), so tasks created in either app show up in both.

-- ========================================================================
-- A. The Supabase Auth identity column
-- ========================================================================
alter table public.task
  add column if not exists user_uuid uuid references auth.users (id) on delete cascade;

create index if not exists task_user_uuid_idx on public.task (user_uuid);

-- ========================================================================
-- B. Make native inserts possible
-- ========================================================================
-- Hibernate allocates IDs in blocks of 50 from task_seq (increment=50) and
-- uses every value in the block it fetched. A plain nextval here claims a
-- whole fresh block per row and uses one value from it — ranges never
-- overlap, so both apps can insert concurrently without PK collisions.
-- (Native task IDs will jump in steps of ~50. Cosmetic, harmless.)
alter table public.task alter column task_id set default nextval('public.task_seq');

-- Defaults mirroring Task.java, so quick-add can send only title + due_date.
alter table public.task alter column creation_date  set default now();
alter table public.task alter column description    set default '';
alter table public.task alter column is_completed   set default false;
alter table public.task alter column category       set default 'Uncategorized';
alter table public.task alter column category_color set default '#fef3c7';
alter table public.task alter column subject        set default '';
alter table public.task alter column subject_color  set default '#e5e7eb';

-- Native-only users have no app_users row, so user_id can no longer be
-- required. Hibernate's ddl-auto=update never re-adds NOT NULL, so this
-- sticks. The web app only ever queries tasks by its own users, so rows
-- with NULL user_id are simply invisible there (correct: they belong to
-- accounts that only exist in Supabase Auth).
alter table public.task alter column user_id drop not null;

-- ========================================================================
-- C. Grants + per-user policies (the actual security wall)
-- ========================================================================
-- GRANT says what the `authenticated` role may attempt; RLS decides row by
-- row. anon gets nothing: you must be logged in to see anything at all.
grant select, insert, update, delete on public.task to authenticated;
grant usage, select on sequence public.task_seq to authenticated;

create policy "read own tasks" on public.task
  for select to authenticated
  using (auth.uid() = user_uuid);

create policy "insert own tasks" on public.task
  for insert to authenticated
  with check (auth.uid() = user_uuid);

create policy "update own tasks" on public.task
  for update to authenticated
  using (auth.uid() = user_uuid)
  with check (auth.uid() = user_uuid);

create policy "delete own tasks" on public.task
  for delete to authenticated
  using (auth.uid() = user_uuid);

-- ========================================================================
-- D. Keep the two user keys in step on every insert
-- ========================================================================
-- SECURITY DEFINER: runs as postgres (the owner), because the authenticated
-- role itself may not read auth.users or app_users. search_path is pinned —
-- standard hardening for definer functions.
create or replace function public.task_fill_user_keys()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_uuid is null and new.user_id is not null then
    -- Insert came from the Java web app: attach the Supabase identity too,
    -- if this user has signed up in the native app (matched by email).
    select u.id into new.user_uuid
    from public.app_users a
    join auth.users u on lower(u.email) = lower(a.email)
    where a.id = new.user_id;
  elsif new.user_id is null and new.user_uuid is not null then
    -- Insert came from the native app: attach the legacy identity too,
    -- if this person also has an old web account (matched by email).
    select a.id into new.user_id
    from auth.users u
    join public.app_users a on lower(a.email) = lower(u.email)
    where u.id = new.user_uuid;
  end if;
  return new;
end;
$$;

drop trigger if exists task_fill_user_keys on public.task;
create trigger task_fill_user_keys
  before insert on public.task
  for each row execute function public.task_fill_user_keys();

-- ========================================================================
-- Sanity check (read-only) — expect 4 rows, one per policy:
--   select policyname, cmd from pg_policies where tablename = 'task';
-- ========================================================================
