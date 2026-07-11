-- 07-events.sql
-- Run ONCE in the Supabase SQL Editor. Calendar EVENTS (handoff MUST):
-- imported from CSV, never created in-app, visually distinct from tasks.
-- Times are wall-clock (timestamp without time zone), same philosophy as
-- task due dates. `source` records the import filename so a whole import
-- can be managed as a batch later. The web app never touches this table.

create table if not exists public.event (
  id bigint generated always as identity primary key,
  user_uuid uuid not null references auth.users (id) on delete cascade,
  title varchar(200) not null,
  start_at timestamp without time zone not null,
  end_at timestamp without time zone,
  all_day boolean not null default false,
  location varchar(200),
  notes varchar(500),
  source varchar(120),
  created_at timestamptz not null default now()
);

create index if not exists event_user_start_idx on public.event (user_uuid, start_at);

alter table public.event enable row level security;

grant select, insert, update, delete on public.event to authenticated;
grant usage, select on sequence public.event_id_seq to authenticated;

create policy "read own events" on public.event
  for select to authenticated using (auth.uid() = user_uuid);
create policy "insert own events" on public.event
  for insert to authenticated with check (auth.uid() = user_uuid);
create policy "delete own events" on public.event
  for delete to authenticated using (auth.uid() = user_uuid);
-- (no update policy: events are imported and deleted, never edited in-app)

-- Sanity check (read-only) — expect 3 rows:
--   select policyname from pg_policies where tablename = 'event';
