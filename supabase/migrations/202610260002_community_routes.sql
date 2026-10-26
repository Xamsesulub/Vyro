begin;
-- Replace generation with explicit, revocable community contributions.
-- Existing saved provider routes remain private legacy bookmarks.
-- Keep historical tables and rows intact. Old RPCs cannot generate or expose
-- cached provider suggestions, even when called by an old server deployment.
create or replace function public.vyro_claim_route_search(p_owner uuid,p_key text,p_minute integer default 30,p_day integer default 600) returns jsonb
language plpgsql security definer set search_path='' as $$ begin raise exception 'ROUTES_UPDATED'; end $$;
create or replace function public.vyro_finish_route_search(p_key text,p_lease uuid,p_routes jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$ begin raise exception 'ROUTES_UPDATED'; end $$;
create or replace function public.vyro_prune_route_suggestions() returns void
language sql security definer set search_path='' as $$ select $$;
alter table public.route_suggestions drop constraint route_suggestions_source_check;
alter table public.route_suggestions add constraint route_suggestions_source_check check(source in ('community','openrouteservice'));
alter table public.route_suggestions drop constraint route_suggestions_distance_m_check;
alter table public.route_suggestions add constraint route_suggestions_distance_m_check check(distance_m between 500 and 50000);
alter table public.route_suggestions add column place text check(length(btrim(place)) between 1 and 100);
alter table public.route_suggestions add column contributor_id uuid references auth.users(id) on delete cascade;
alter table public.route_suggestions add column latitude double precision;
alter table public.route_suggestions add column longitude double precision;
alter table public.route_suggestions add constraint community_route_metadata check(source <> 'community' or (contributor_id is not null and place is not null and latitude between -85 and 85 and longitude between -180 and 180));
create index community_routes_area on public.route_suggestions(latitude,longitude) where source='community';
alter table public.saved_route_suggestions drop constraint saved_route_suggestions_route_id_fkey;
alter table public.saved_route_suggestions add foreign key(route_id) references public.route_suggestions(id) on delete cascade;
drop policy route_suggestions_read on public.route_suggestions;
create policy route_suggestions_read on public.route_suggestions for select to authenticated using(
  source='community' or exists(select 1 from public.saved_route_suggestions s where s.route_id=id and s.owner_id=(select auth.uid()))
);

-- Local workout identifiers are receipts, never public route metadata.
create table public.route_contributions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null check(length(local_id) between 1 and 120),
  route_id text not null unique references public.route_suggestions(id) on delete cascade,
  primary key(owner_id,local_id)
);
alter table public.route_contributions enable row level security;
revoke all on public.route_contributions from public,anon,authenticated;
grant select on public.route_contributions to authenticated;
create policy own_contribution on public.route_contributions for select to authenticated using(owner_id=(select auth.uid()));
create trigger limit_route_contributions before insert on public.route_contributions for each row execute function public.limit_vyro_write();

-- Regularly spaced points avoid dependence on device sampling frequency.
-- The index supports nearby point lookups without a provider or PostGIS.
create table public.route_similarity_points (
  route_id text not null references public.route_suggestions(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null
);
create index route_similarity_area on public.route_similarity_points(latitude,longitude,route_id);
create index route_similarity_route on public.route_similarity_points(route_id);
alter table public.route_similarity_points enable row level security;
revoke all on public.route_similarity_points from public,anon,authenticated;

create function public.vyro_route_meters(a jsonb,b jsonb) returns double precision
language sql immutable set search_path='' as $$
 select 12742000*asin(least(1.0,sqrt(
   power(sin(radians((b->>'latitude')::double precision-(a->>'latitude')::double precision)/2),2)+
   cos(radians((a->>'latitude')::double precision))*cos(radians((b->>'latitude')::double precision))*
   power(sin(radians((b->>'longitude')::double precision-(a->>'longitude')::double precision)/2),2))))
$$;
create function public.vyro_route_measure(p_route jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare p jsonb; prev jsonb; samples jsonb:='[]'; d double precision; total double precision:=0;
  remaining double precision:=35; along double precision; fraction double precision;
begin
  if not public.valid_vyro_route(p_route) then raise exception 'ROUTE_INVALID'; end if;
  for p in select value from jsonb_array_elements(p_route) loop
    if abs((p->>'latitude')::double precision)>85 then raise exception 'ROUTE_INVALID'; end if;
    if prev is null or coalesce((p->>'breakBefore')::boolean,false) then
      remaining:=35;
      samples:=samples||jsonb_build_array(p-'breakBefore');
    else
      d:=public.vyro_route_meters(prev,p);
      if d>5000 then raise exception 'ROUTE_INVALID'; end if;
      total:=total+d;
      if total>50000 then raise exception 'ROUTE_INVALID'; end if;
      along:=remaining;
      while along<=d and d>0 loop
        fraction:=along/d;
        samples:=samples||jsonb_build_array(jsonb_build_object(
          'latitude',(prev->>'latitude')::double precision+fraction*((p->>'latitude')::double precision-(prev->>'latitude')::double precision),
          'longitude',(prev->>'longitude')::double precision+fraction*((p->>'longitude')::double precision-(prev->>'longitude')::double precision)));
        along:=along+35;
      end loop;
      remaining:=along-d;
    end if;
    if jsonb_array_length(samples)>1600 then raise exception 'ROUTE_INVALID'; end if;
    prev:=p;
  end loop;
  if total<500 then raise exception 'ROUTE_INVALID'; end if;
  return jsonb_build_object('distance',round(total::numeric),'samples',samples);
end $$;
revoke all on function public.vyro_route_meters(jsonb,jsonb),public.vyro_route_measure(jsonb) from public,anon,authenticated;

create function public.contribute_route(p_local_id text,p_name text,p_place text,p_sport text,p_route jsonb,p_source text,p_consent boolean) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result text; measured jsonb; samples jsonb; distance numeric;
  candidate record; coverage double precision; reverse_coverage double precision; center_lat double precision; center_lon double precision;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_consent is distinct from true then raise exception 'ROUTE_CONSENT_REQUIRED'; end if;
  if p_source is distinct from 'gps' or p_sport is null or p_sport not in ('Løping','Gange','Fottur')
    or p_name is null or length(btrim(p_name)) not between 1 and 120
    or p_place is null or length(btrim(p_place)) not between 1 and 100
    or p_local_id is null or length(p_local_id) not between 1 and 120 then raise exception 'ROUTE_INVALID'; end if;
  -- One contribution at a time makes duplicate detection atomic across accounts.
  perform pg_advisory_xact_lock(hashtextextended('community-route-contribution',0));
  select route_id into result from public.route_contributions where owner_id=actor and local_id=p_local_id;
  if found then return result; end if;
  if (select count(*) from public.route_suggestions where contributor_id=actor)>=100
    or (select count(*) from public.route_suggestions where contributor_id=actor and created_at>now()-interval '1 day')>=10 then raise exception 'ROUTE_SHARE_LIMIT'; end if;
  measured:=public.vyro_route_measure(p_route); samples:=measured->'samples'; distance:=(measured->>'distance')::numeric;
  select avg((value->>'latitude')::double precision),avg((value->>'longitude')::double precision) into center_lat,center_lon from jsonb_array_elements(samples);
  for candidate in
    select r.id from public.route_suggestions r where r.source='community'
      and abs(r.latitude-center_lat)<0.5 and abs(r.longitude-center_lon)<5
  loop
    select avg(case when exists(
      select 1 from public.route_similarity_points old where old.route_id=candidate.id
      and old.latitude between (p->>'latitude')::double precision-0.0005 and (p->>'latitude')::double precision+0.0005
      and old.longitude between (p->>'longitude')::double precision-0.006 and (p->>'longitude')::double precision+0.006
      and public.vyro_route_meters(p,jsonb_build_object('latitude',old.latitude,'longitude',old.longitude))<=45
    ) then 1.0 else 0.0 end) into coverage from jsonb_array_elements(samples) p;
    if coverage<0.90 then continue; end if;
    select avg(case when exists(
      select 1 from jsonb_array_elements(samples) p where
      abs((p->>'latitude')::double precision-old.latitude)<0.0005 and abs((p->>'longitude')::double precision-old.longitude)<0.006
      and public.vyro_route_meters(p,jsonb_build_object('latitude',old.latitude,'longitude',old.longitude))<=45
    ) then 1.0 else 0.0 end) into reverse_coverage from public.route_similarity_points old where old.route_id=candidate.id;
    if reverse_coverage>=0.90 then raise exception 'ROUTE_DUPLICATE'; end if;
  end loop;
  result:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.route_suggestions(id,name,sport,route,distance_m,source,attribution,place,contributor_id,latitude,longitude)
    values(result,btrim(p_name),p_sport,p_route,distance,'community','Delt av VYRO-fellesskapet',btrim(p_place),actor,center_lat,center_lon);
  insert into public.route_contributions values(actor,p_local_id,result);
  insert into public.route_similarity_points select result,(value->>'latitude')::double precision,(value->>'longitude')::double precision from jsonb_array_elements(samples);
  return result;
end $$;
revoke all on function public.contribute_route(text,text,text,text,jsonb,text,boolean) from public,anon;
grant execute on function public.contribute_route(text,text,text,text,jsonb,text,boolean) to authenticated;

create function public.withdraw_route(p_route_id text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('community-route-contribution',0));
  delete from public.route_suggestions where id=p_route_id and contributor_id=auth.uid() and source='community';
  if not found then raise exception 'ROUTE_NOT_FOUND'; end if;
end $$;
revoke all on function public.withdraw_route(text) from public,anon;
grant execute on function public.withdraw_route(text) to authenticated;

create function public.search_community_routes(p_latitude double precision,p_longitude double precision,p_sport text,p_length integer default 0) returns setof public.route_suggestions
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_latitude is null or p_latitude not between -85 and 85 or p_longitude is null or p_longitude not between -180 and 180
    or p_sport is null or p_sport not in ('Løping','Gange','Fottur') or p_length is null or p_length not in (0,3000,5000,10000,15000) then raise exception 'INVALID_QUERY'; end if;
  return query select r.* from public.route_suggestions r where r.source='community'
    and r.sport=p_sport and (p_length=0 or r.distance_m between p_length*0.6 and p_length*1.5)
    and r.latitude between p_latitude-0.14 and p_latitude+0.14
    and public.vyro_route_meters(jsonb_build_object('latitude',p_latitude,'longitude',p_longitude),jsonb_build_object('latitude',r.latitude,'longitude',r.longitude))<=15000
    order by public.vyro_route_meters(jsonb_build_object('latitude',p_latitude,'longitude',p_longitude),jsonb_build_object('latitude',r.latitude,'longitude',r.longitude)),r.created_at desc,r.id limit 20;
end $$;
revoke all on function public.search_community_routes(double precision,double precision,text,integer) from public,anon;
grant execute on function public.search_community_routes(double precision,double precision,text,integer) to authenticated;

create or replace function public.save_route_suggestion(p_route_id text,p_name text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('save-route:'||actor::text,0));
  if exists(select 1 from public.saved_route_suggestions where owner_id=actor and route_id=p_route_id) then
    update public.saved_route_suggestions set name=coalesce(nullif(btrim(p_name),''),name) where owner_id=actor and route_id=p_route_id;
    return;
  end if;
  if not exists(select 1 from public.route_suggestions where id=p_route_id and source='community') then raise exception 'ROUTE_NOT_FOUND'; end if;
  if (select count(*) from public.saved_route_suggestions where owner_id=actor)>=500 then raise exception 'ROUTE_LIBRARY_FULL'; end if;
  insert into public.saved_route_suggestions(owner_id,route_id,name)
    values(actor,p_route_id,coalesce(nullif(btrim(p_name),''),(select name from public.route_suggestions where id=p_route_id)));
end $$;
-- Historical suggestions remain stored but are only readable by their existing
-- bookmark owners. Search returns community contributions exclusively.
commit;
