begin;

-- An API client can bypass all app validation. Validate again in PostgreSQL.
create or replace function public.valid_vyro_route(route jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare p jsonb;
begin
  if route is null or jsonb_typeof(route) <> 'array' then return false; end if;
  if octet_length(route::text) > 2000000 then return false; end if;
  if jsonb_array_length(route) not between 2 and 20000 then return false; end if;
  for p in select value from jsonb_array_elements(route) loop
    if jsonb_typeof(p) <> 'object' then return false; end if;
    if p - 'latitude' - 'longitude' - 'breakBefore' <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(p->'latitude') is distinct from 'number'
      or jsonb_typeof(p->'longitude') is distinct from 'number' then return false; end if;
    if p ? 'breakBefore' and jsonb_typeof(p->'breakBefore') <> 'boolean' then return false; end if;
    if (p->>'latitude')::numeric not between -90 and 90
      or (p->>'longitude')::numeric not between -180 and 180 then return false; end if;
  end loop;
  return true;
end $$;

-- Small fixed row count per user/action, inaccessible through the client API.
create table public.write_limits (
  actor uuid not null references auth.users(id) on delete cascade,
  action text not null,
  bucket timestamptz not null,
  attempts integer not null,
  primary key(actor, action)
);
alter table public.write_limits enable row level security;
revoke all on public.write_limits from public, anon, authenticated;

create function public.limit_vyro_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); maximum integer; attempts integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  maximum := case tg_table_name when 'activities' then 5 when 'comments' then 20 else 60 end;
  insert into public.write_limits as limits(actor,action,bucket,attempts)
  values(actor,tg_table_name,date_trunc('minute',now()),1)
  on conflict on constraint write_limits_pkey do update set
    bucket=excluded.bucket,
    attempts=case when limits.bucket=excluded.bucket then limits.attempts+1 else 1 end
  returning limits.attempts into attempts;
  if attempts > maximum then raise exception 'Too many writes. Try again later.' using errcode='P0001'; end if;
  if tg_table_name in ('follows','comments','reposts') then new.created_at := now(); end if;
  return new;
end $$;
revoke all on function public.limit_vyro_write() from public, anon, authenticated;
create trigger limit_activities before insert on public.activities for each row execute function public.limit_vyro_write();
create trigger limit_comments before insert on public.comments for each row execute function public.limit_vyro_write();
create trigger limit_follows before insert on public.follows for each row execute function public.limit_vyro_write();
create trigger limit_likes before insert on public.likes for each row execute function public.limit_vyro_write();
create trigger limit_reposts before insert on public.reposts for each row execute function public.limit_vyro_write();

-- Do not grant future tables to API roles implicitly.
alter default privileges in schema public revoke all on tables from anon, authenticated;
commit;
