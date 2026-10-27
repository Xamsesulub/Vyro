-- Football analysis: derived speed only; private raw GPS evidence stays private.
begin;
alter table public.posts add column max_speed_kmh numeric
  check (max_speed_kmh is null or (sport = 'Fotball' and max_speed_kmh between 0 and 54));

create function public.publish_football_workout(
  p_local_id text, p_title text, p_sport text, p_distance_km numeric,
  p_seconds integer, p_recorded_at timestamptz, p_source text, p_route jsonb,
  p_audience text default 'followers', p_max_speed_kmh numeric default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare post_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_sport is distinct from 'Fotball' or
    (p_max_speed_kmh is not null and p_max_speed_kmh not between 0 and 54)
    then raise exception 'Invalid football analysis' using errcode = '22023'; end if;
  -- Existing publication validates GPS source/geometry and derives ownership
  -- from auth.uid(). This wrapper retains the same audience and RLS rules.
  post_id := public.publish_workout(p_local_id,p_title,p_sport,p_distance_km,
    p_seconds,p_recorded_at,p_source,p_route,p_audience);
  update public.posts set max_speed_kmh = p_max_speed_kmh
    where id = post_id and author_id = auth.uid();
  return post_id;
end $$;
revoke all on function public.publish_football_workout(text,text,text,numeric,integer,timestamptz,text,jsonb,text,numeric) from public,anon;
grant execute on function public.publish_football_workout(text,text,text,numeric,integer,timestamptz,text,jsonb,text,numeric) to authenticated;

create or replace function public.valid_vyro_backup(payload jsonb, owner uuid, local_id text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare s jsonb; n integer := 0; elapsed numeric := 0;
begin
  if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text) > 2500000 then return false; end if;
  if payload - array['id','ownerId','source','visibility','title','notes','sport','distance','seconds','date','route','splits','maxSpeedKmh'] <> '{}'::jsonb then return false; end if;
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
  if payload ? 'maxSpeedKmh' then
    if payload->>'sport' <> 'Fotball' or jsonb_typeof(payload->'maxSpeedKmh') is distinct from 'number'
      or (payload->>'maxSpeedKmh')::numeric not between 0 and 54 then return false; end if;
  end if;
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
