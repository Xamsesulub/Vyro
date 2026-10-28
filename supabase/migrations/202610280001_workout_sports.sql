-- Native sport catalogue and private timer workouts. Existing workouts are retained.
begin;
create or replace function public.valid_vyro_sport(sport text) returns boolean
language sql immutable set search_path = '' as $$
 select coalesce(sport in ('Løping','Terrengløping','Gange','Fottur','Sykling','Terrengsykling','Gravelsykling','Elsykkel','Spinning','Langrenn','Alpint','Snowboard','Skøyter','Truger','Fotball','Basketball','Volleyball','Cricket','Tennis','Padel','Badminton','Svømming','Kajakk','Roing','Padling','Rulleskøyter','Rulleski','Skateboarding','Klatring','Styrketrening','HIIT','Elliptisk','Trappemaskin','Yoga','Pilates','Dans'),false);
$$;

alter table public.activities drop constraint activities_sport_check;
alter table public.activities add constraint activities_sport_check check(public.valid_vyro_sport(sport));
alter table public.activities drop constraint activities_source_check;
alter table public.activities drop constraint activities_distance_km_check;
alter table public.activities drop constraint activities_route_check;
alter table public.activities add constraint activities_source_check check(source in ('gps','timer'));
alter table public.activities add constraint activities_measurement_check check(
 (source='gps' and distance_km > 0 and distance_km < 10000 and public.valid_vyro_route(route))
 or (source='timer' and distance_km=0 and route='[]'::jsonb)
);

create or replace function public.publish_workout(
  p_local_id text, p_title text, p_sport text, p_distance_km numeric,
  p_seconds integer, p_recorded_at timestamptz, p_source text, p_route jsonb, p_audience text default 'followers'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); activity public.activities; post_id uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_source is distinct from 'gps' and p_source is distinct from 'timer' then raise exception 'Only recorded workouts may be shared'; end if;
  insert into public.activities(owner_id,local_id,title,sport,distance_km,seconds,recorded_at,source,route)
  values(actor,p_local_id,btrim(p_title),p_sport,p_distance_km,p_seconds,p_recorded_at,p_source,p_route)
  on conflict(owner_id,local_id) do update set route=excluded.route
  returning * into activity;
  insert into public.posts(activity_id,author_id,title,sport,distance_km,seconds,recorded_at,route,audience)
  values(activity.id,actor,activity.title,activity.sport,activity.distance_km,activity.seconds,activity.recorded_at,activity.route,p_audience)
  on conflict(activity_id) do update set route=excluded.route, audience=excluded.audience
  returning id into post_id;
  return post_id;
end $$;
revoke all on function public.publish_workout(text,text,text,numeric,integer,timestamptz,text,jsonb,text) from public,anon;
grant execute on function public.publish_workout(text,text,text,numeric,integer,timestamptz,text,jsonb,text) to authenticated;

create or replace function public.valid_vyro_backup(payload jsonb, owner uuid, local_id text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare s jsonb; n integer := 0; elapsed numeric := 0;
begin
  if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text) > 2500000 then return false; end if;
  if payload - array['id','ownerId','source','visibility','title','notes','sport','distance','seconds','date','route','splits','maxSpeedKmh','workoutType','effort'] <> '{}'::jsonb then return false; end if;
  if jsonb_typeof(payload->'id') is distinct from 'string' then return false; end if;
  if payload->>'id' is distinct from local_id or payload->>'ownerId' is distinct from owner::text
    or (payload->>'source' is distinct from 'gps' and payload->>'source' is distinct from 'timer') or payload->>'visibility' is distinct from 'private' then return false; end if;
  if not (payload ?& array['title','notes','sport','distance','seconds','date','route']) then return false; end if;
  if jsonb_typeof(payload->'title') <> 'string' or length(btrim(payload->>'title')) not between 1 and 120
    or jsonb_typeof(payload->'notes') <> 'string' or length(payload->>'notes') > 10000
    or jsonb_typeof(payload->'sport') <> 'string' or not public.valid_vyro_sport(payload->>'sport')
    or jsonb_typeof(payload->'distance') <> 'number' or (case when payload->>'source'='timer' then (payload->>'distance')::numeric <> 0 else (payload->>'distance')::numeric <= 0 end) or (payload->>'distance')::numeric > 5000
    or jsonb_typeof(payload->'seconds') <> 'number' or (payload->>'seconds')::numeric <= 0 or (payload->>'seconds')::numeric > 2592000
    or jsonb_typeof(payload->'date') <> 'string' or length(payload->>'date') > 40
    or (case when payload->>'source'='timer' then payload->'route' is distinct from '[]'::jsonb else not public.valid_vyro_route(payload->'route') end) then return false; end if;
  if not isfinite((payload->>'date')::timestamptz) then return false; end if;
  if payload ? 'maxSpeedKmh' then
    if payload->>'source' <> 'gps' or payload->>'sport' <> 'Fotball' or jsonb_typeof(payload->'maxSpeedKmh') is distinct from 'number'
      or (payload->>'maxSpeedKmh')::numeric not between 0 and 54 then return false; end if;
  end if;
  if payload ? 'workoutType' then
    if jsonb_typeof(payload->'workoutType') is distinct from 'string' or payload->>'workoutType' not in ('Vanlig økt','Rolig økt','Intervall','Langtur','Konkurranse','Teknikk','Kamp','Trening') then return false; end if;
  end if;
  if payload ? 'effort' then
    if jsonb_typeof(payload->'effort') is distinct from 'number' or (payload->>'effort')::numeric not between 1 and 10 or trunc((payload->>'effort')::numeric) <> (payload->>'effort')::numeric then return false; end if;
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


notify pgrst, 'reload schema';
commit;
