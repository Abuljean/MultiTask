-- 01-enable-rls.sql
-- Turns on Row Level Security for the three public tables. With RLS on and
-- NO policies defined, API clients (anon/authenticated roles) can do nothing
-- at all — the tables are locked until 02 grants per-user access to `task`.
--
-- The deployed Vaadin web app is NOT affected: it connects as the `postgres`
-- role, which OWNS these tables (Hibernate created them), and Postgres skips
-- row security for the table owner. That is also why this file deliberately
-- does NOT use FORCE ROW LEVEL SECURITY — forcing it would apply policies to
-- the owner too and break the web app.
--
-- app_users and verification_tokens stay policy-less permanently: they belong
-- to the old Java auth system and the native app never reads them. RLS-on with
-- no policies = permanently sealed from the public API.

alter table public.task enable row level security;
alter table public.app_users enable row level security;
alter table public.verification_tokens enable row level security;
