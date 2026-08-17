-- 12: Account deletion, second attempt. Re-runnable; replaces 11's function.
--
-- WHY: the v1 function died on real devices ("couldn't delete" in TestFlight,
-- 2026-08-17). Two traps, both around storage:
--   1. The postgres-owned SECURITY DEFINER function may lack DML on
--      storage.objects (Supabase moved the storage schema fully under
--      supabase_storage_admin). Postgres checks privileges BEFORE matching
--      rows, so the statement aborts the whole transaction even for an
--      account with zero files.
--   2. Supabase's own docs: an auth user who still OWNS storage objects can
--      fail to delete outright.
-- Fix: the APP now deletes the user's avatar files first, as the signed-in
-- user (the bucket's owner-delete RLS policy allows exactly that), and this
-- function only best-efforts any stragglers, ignoring a permission error
-- instead of letting it kill the account deletion.
--
-- If auth.users deletion STILL fails after this, the client now surfaces the
-- real error message - read it. The fallback design at that point is an Edge
-- Function using the service-role admin API (auth.admin.deleteUser).

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

  -- Owned data. (The FKs are all ON DELETE CASCADE, so these are belt and
  -- suspenders for the auth delete below.)
  delete from public.recurring_completion where user_uuid = uid;
  delete from public.recurring_task where user_uuid = uid;
  delete from public.event where user_uuid = uid;
  delete from public.task where user_uuid = uid;

  -- Best-effort sweep of any avatar files the client failed to remove.
  -- Ignored on permission denial - the client already deleted its files,
  -- and a leftover row must never block the account deletion itself.
  begin
    delete from storage.objects
     where bucket_id = 'avatars'
       and (storage.foldername(name))[1] = uid::text;
  exception when insufficient_privilege then
    null;
  end;

  -- The account itself. Sessions and identities cascade with it.
  delete from auth.users where id = uid;
end;
$$;

-- v1's revoke-from-public did not strip the per-role default grants, so anon
-- could still EXECUTE (it only got as far as 'not signed in', but still).
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

-- Make PostgREST pick the new definition up immediately.
notify pgrst, 'reload schema';
