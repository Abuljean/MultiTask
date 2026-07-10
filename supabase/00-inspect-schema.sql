-- 00-inspect-schema.sql
-- READ-ONLY. Changes nothing. Run in the Supabase SQL Editor and paste the
-- result back so the real migration (02) can be written against the actual
-- schema instead of guesses. One combined query = one result grid to copy.
--
-- What it returns, as rows of (kind, name, detail):
--   column     — every column in public tables, with type/nullability/default
--   constraint — primary keys, foreign keys, uniques
--   sequence   — ID sequences (matters for how the native app inserts rows)
--   rowcount   — how many rows are in play

select 'column' as kind,
       table_name || '.' || column_name as name,
       data_type
         || case when is_nullable = 'NO' then ' NOT NULL' else '' end
         || coalesce(' DEFAULT ' || column_default, '') as detail
from information_schema.columns
where table_schema = 'public'

union all

select 'constraint',
       conrelid::regclass::text || ' : ' || conname,
       pg_get_constraintdef(oid)
from pg_constraint
where connamespace = 'public'::regnamespace

union all

select 'sequence',
       schemaname || '.' || sequencename,
       'last_value=' || coalesce(last_value::text, 'unused')
         || '  increment=' || increment_by
from pg_sequences
where schemaname = 'public'

union all

select 'rowcount', 'public.task', count(*)::text from public.task
union all
select 'rowcount', 'public.app_users', count(*)::text from public.app_users
union all
select 'rowcount', 'public.verification_tokens', count(*)::text from public.verification_tokens

order by 1, 2;
