begin;
create table public.account_deletions (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now()
);
alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from public,anon,authenticated;
create function public.vyro_account_active() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from public.account_deletions where owner_id=auth.uid())
$$;
revoke all on function public.vyro_account_active() from public,anon;
grant execute on function public.vyro_account_active() to authenticated;
-- Only the authenticated edge handler may request deletion for its verified user.
-- Refreshing a token does not renew this recent-login check.
create function public.vyro_begin_account_deletion(p_owner uuid,p_session uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.sessions where id=p_session and user_id=p_owner
   and created_at>now()-interval '15 minutes') then
   raise exception 'Sign in again before deleting your account' using errcode='42501'; end if;
 insert into public.account_deletions(owner_id) values(p_owner) on conflict do nothing;
 delete from public.push_devices where owner_id=p_owner;
end $$;
revoke all on function public.vyro_begin_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.vyro_begin_account_deletion(uuid,uuid) to service_role;
create function public.vyro_guard_deleting_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and exists(select 1 from public.account_deletions where owner_id=auth.uid())
 then raise exception 'Account deletion in progress' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function public.vyro_guard_deleting_account() from public,anon,authenticated;
-- Also applies to writes performed by security-definer RPCs. Auth-context-free
-- scheduler/admin cleanup remains allowed. Uploads started after this intent
-- are rejected. Auth deletion itself refuses remaining owned storage objects.
do $$ declare t record; begin
 for t in select tablename from pg_tables p where schemaname='public' and tablename<>'account_deletions'
 and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass
   and d.objid=format('public.%I',p.tablename)::regclass and d.deptype='e') loop
  execute format('create trigger guard_deleting_account before insert or update on public.%I for each row execute function public.vyro_guard_deleting_account()',t.tablename);
 end loop;
 if to_regclass('storage.objects') is not null then
  execute 'create policy active_uploads on storage.objects as restrictive for insert to authenticated with check(public.vyro_account_active())';
  execute 'create policy active_upload_updates on storage.objects as restrictive for update to authenticated using(public.vyro_account_active()) with check(public.vyro_account_active())';
 end if;
end $$;
commit;
