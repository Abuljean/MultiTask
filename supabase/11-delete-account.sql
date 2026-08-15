-- 11: In-app account deletion (App Store guideline 5.1.1(v) requires it).
-- A security-definer function the signed-in user calls on themselves. It
-- removes every row they own and then the auth user itself. Client access
-- goes through supabase.rpc('delete_own_account') from the Settings screen.
-- Re-runnable.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  -- Owned data first (the auth row may be referenced by FKs).
  delete from public.recurring_completion where user_uuid = uid;
  delete from public.recurring_task where user_uuid = uid;
  delete from public.event where user_uuid = uid;
  delete from public.task where user_uuid = uid;

  -- Avatar files live under a folder named by the user's uuid.
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = uid::text;

  -- Finally the account itself. Sessions die with it.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
