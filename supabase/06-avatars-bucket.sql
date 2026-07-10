-- 06-avatars-bucket.sql
-- Run ONCE in the Supabase SQL Editor. Creates the public `avatars` storage
-- bucket for profile pictures. Each user may only write inside their own
-- folder (avatars/<their-uuid>/...); anyone may read (public bucket, the
-- avatar URL is embedded in the app).
--
-- NOTE: if the CREATE POLICY statements fail with a "must be owner of table
-- objects" error (some projects restrict storage.objects), create the bucket
-- and policies through the Dashboard instead: Storage → New bucket →
-- "avatars", public — then Policies → use the "Give users access to only
-- their own top level folder" template for INSERT/UPDATE/DELETE.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
