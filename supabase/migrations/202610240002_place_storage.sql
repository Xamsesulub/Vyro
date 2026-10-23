begin;
-- Plain PostgreSQL test environments have no Storage service. The dedicated
-- integration suite supplies the Storage schema and exercises these policies.
do $$ begin
  if to_regclass('storage.objects') is null then return; end if;
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
    values('place-photos','place-photos',false,5242880,array['image/jpeg']);
  create policy vyro_photos_insert on storage.objects for insert to authenticated with check (
    bucket_id='place-photos' and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f-]{36}\.jpg$')
  );
  create policy vyro_photos_read on storage.objects for select to authenticated using (
    bucket_id='place-photos' and (
      split_part(name,'/',1)=(select auth.uid())::text or
      exists(select 1 from public.place_posts p where p.photo_path=name)
    )
  );
  -- No UPDATE policy: a published image cannot be silently replaced.
  create policy vyro_photos_delete on storage.objects for delete to authenticated using (
    bucket_id='place-photos' and split_part(name,'/',1)=(select auth.uid())::text
    and not exists(select 1 from public.place_posts p where p.photo_path=name)
  );
end $$;
commit;
