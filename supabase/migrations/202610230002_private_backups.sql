begin;

create function public.valid_vyro_backup(payload jsonb, owner uuid, local_id text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare s jsonb; n integer := 0; elapsed numeric := 0;
begin
  if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text) > 2500000 then return false; end if;
  if payload - array['id','ownerId','source','visibility','title','notes','sport','distance','seconds','date','route','splits'] <> '{}'::jsonb then return false; end if;
  if jsonb_typeof(payload->'id') is distinct from 'string' then return false; end if;
  if payload->>'id' is distinct from local_id or payload->>'ownerId' is distinct from owner::text
    or payload->>'source' is distinct from 'gps' or payload->>'visibility' is distinct from 'private' then return false; end if;
  if not (payload ?& array['title','notes','sport','distance','seconds','date','route']) then return false; end if;
  if jsonb_typeof(payload->'title') <> 'string' or length(btrim(payload->>'title')) not between 1 and 120
    or jsonb_typeof(payload->'notes') <> 'string' or length(payload->>'notes') > 10000
    or jsonb_typeof(payload->'sport') <> 'string' or payload->>'sport' not in ('Løping','Gange','Sykling','Fottur')
    or jsonb_typeof(payload->'distance') <> 'number' or (payload->>'distance')::numeric <= 0 or (payload->>'distance')::numeric > 5000
    or jsonb_typeof(payload->'seconds') <> 'number' or (payload->>'seconds')::numeric <= 0 or (payload->>'seconds')::numeric > 2592000
    or jsonb_typeof(payload->'date') <> 'string' or length(payload->>'date') > 40
    or not public.valid_vyro_route(payload->'route') then return false; end if;
  if not isfinite((payload->>'date')::timestamptz) then return false; end if;
  if payload ? 'splits' then
    if jsonb_typeof(payload->'splits') <> 'array' or jsonb_array_length(payload->'splits') > floor((payload->>'distance')::numeric) then return false; end if;
    for s in select value from jsonb_array_elements(payload->'splits') loop
      n := n + 1;
      if jsonb_typeof(s) <> 'object' or s - array['kilometer','seconds','elapsedSeconds'] <> '{}'::jsonb
        or jsonb_typeof(s->'kilometer') is distinct from 'number' or (s->>'kilometer')::numeric <> n
        or jsonb_typeof(s->'seconds') is distinct from 'number' or (s->>'seconds')::numeric <= 0
        or jsonb_typeof(s->'elapsedSeconds') is distinct from 'number' or (s->>'elapsedSeconds')::numeric > (payload->>'seconds')::numeric + 1
        or abs((s->>'elapsedSeconds')::numeric - elapsed - (s->>'seconds')::numeric) >= 0.01 then return false; end if;
      elapsed := (s->>'elapsedSeconds')::numeric;
    end loop;
  end if;
  return true;
exception when others then return false;
end $$;
revoke all on function public.valid_vyro_backup(jsonb,uuid,text) from public, anon;
grant execute on function public.valid_vyro_backup(jsonb,uuid,text) to authenticated;

-- Separate from activities/posts: complete, private routes must never enter feeds.
create table public.workout_backups (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null check (local_id ~ '^[a-zA-Z0-9_-]{1,120}$'),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id,local_id),
  constraint valid_backup check (public.valid_vyro_backup(payload,owner_id,local_id))
);
alter table public.workout_backups enable row level security;
revoke all on public.workout_backups from public, anon, authenticated;
grant select, delete on public.workout_backups to authenticated;
grant insert (owner_id,local_id,payload) on public.workout_backups to authenticated;
create policy backup_read on public.workout_backups for select to authenticated using (owner_id = (select auth.uid()));
create policy backup_insert on public.workout_backups for insert to authenticated with check (owner_id = (select auth.uid()));
create policy backup_delete on public.workout_backups for delete to authenticated using (owner_id = (select auth.uid()));
-- Immutable rows and idempotent insert-on-conflict. Existing per-user limit: 60/min.
create trigger limit_workout_backups before insert on public.workout_backups for each row execute function public.limit_vyro_write();
commit;
