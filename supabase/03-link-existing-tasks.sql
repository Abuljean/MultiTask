-- 03-link-existing-tasks.sql
-- RE-RUNNABLE. Attaches pre-existing web-app tasks to Supabase Auth accounts,
-- matched by email. Run it any time after someone (including you) signs up in
-- the native app with the same email they used on the web app — their old
-- tasks then appear in the native app. Rows with no matching signup are left
-- untouched; running it twice is harmless (it only touches unlinked rows).

update public.task t
set user_uuid = u.id
from public.app_users a
join auth.users u on lower(u.email) = lower(a.email)
where t.user_id = a.id
  and t.user_uuid is null;

-- Returns the number of still-unlinked tasks afterwards (0 = everyone's
-- tasks are linked; nonzero = those users haven't signed up natively yet):
select count(*) as tasks_not_yet_linked from public.task where user_uuid is null;
