-- Add football without changing ownership, privacy or route validation.
begin;
alter table public.activities drop constraint activities_sport_check;
alter table public.activities add constraint activities_sport_check
  check (sport in ('Løping','Gange','Sykling','Fottur','Fotball'));

create or replace function public.valid_vyro_backup(payload jsonb, owner uuid, local_id text)
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
    or jsonb_typeof(payload->'sport') <> 'string' or payload->>'sport' not in ('Løping','Gange','Sykling','Fottur','Fotball')
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

commit;
