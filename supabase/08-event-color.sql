-- 08-event-color.sql
-- Run ONCE in the Supabase SQL Editor. Adds per-event color (hex string):
-- either from a `color` column in the imported CSV, or the default picked
-- in the import sheet. NULL = the theme's standard event blue.

alter table public.event
  add column if not exists color varchar(24);
