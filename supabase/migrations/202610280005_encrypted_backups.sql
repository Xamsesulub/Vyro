begin;
create table public.backup_vaults (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  key_id uuid not null unique,
  verifier text not null check(length(verifier) between 40 and 1024 and verifier ~ '^[A-Za-z0-9+/]+={0,2}$'),
  created_at timestamptz not null default now(),
  unique(owner_id,key_id)
);
create table public.encrypted_workout_backups (
  owner_id uuid not null,
  local_id text not null check(local_id ~ '^[a-zA-Z0-9_-]{1,120}$'),
  key_id uuid not null,
  ciphertext text not null check(length(ciphertext) between 40 and 3500000 and ciphertext ~ '^[A-Za-z0-9+/]+={0,2}$'),
  created_at timestamptz not null default now(),
  primary key(owner_id,local_id),
  foreign key(owner_id,key_id) references public.backup_vaults(owner_id,key_id) on delete cascade
);
alter table public.backup_vaults enable row level security;
alter table public.encrypted_workout_backups enable row level security;
revoke all on public.backup_vaults,public.encrypted_workout_backups from public,anon,authenticated;
grant select on public.backup_vaults,public.encrypted_workout_backups to authenticated;
grant insert(owner_id,key_id,verifier) on public.backup_vaults to authenticated;
grant insert(owner_id,local_id,key_id,ciphertext) on public.encrypted_workout_backups to authenticated;
grant delete on public.encrypted_workout_backups to authenticated;
create policy vault_read on public.backup_vaults for select to authenticated using(owner_id=(select auth.uid()));
create policy vault_create on public.backup_vaults for insert to authenticated with check(owner_id=(select auth.uid()));
create policy encrypted_backup_read on public.encrypted_workout_backups for select to authenticated using(owner_id=(select auth.uid()));
create policy encrypted_backup_insert on public.encrypted_workout_backups for insert to authenticated with check(owner_id=(select auth.uid()));
create policy encrypted_backup_delete on public.encrypted_workout_backups for delete to authenticated using(owner_id=(select auth.uid()));
create trigger encrypted_backup_limit before insert on public.encrypted_workout_backups for each row execute function public.limit_vyro_write();
-- Older app versions may read/delete their old backups, but cannot send plaintext
-- once this account has opted into encryption. No automatic data deletion here.
do $$ begin
 if to_regclass('public.workout_backups') is null then
  -- Some deployments never enabled legacy backup. Provide an empty read/delete
  -- compatibility table without ever granting plaintext uploads there.
  create table public.workout_backups (
   owner_id uuid not null references auth.users(id) on delete cascade,
   local_id text not null check(local_id ~ '^[a-zA-Z0-9_-]{1,120}$'),
   payload jsonb not null, created_at timestamptz not null default now(),
   primary key(owner_id,local_id)
  );
  alter table public.workout_backups enable row level security;
  revoke all on public.workout_backups from public,anon,authenticated;
  grant select,delete on public.workout_backups to authenticated;
  create policy backup_read on public.workout_backups for select to authenticated using(owner_id=(select auth.uid()));
  create policy backup_delete on public.workout_backups for delete to authenticated using(owner_id=(select auth.uid()));
 else
  drop policy if exists backup_insert on public.workout_backups;
  create policy backup_insert on public.workout_backups for insert to authenticated with check (
   owner_id=(select auth.uid()) and not exists(select 1 from public.backup_vaults v where v.owner_id=(select auth.uid())));
 end if;
end $$;
commit;
