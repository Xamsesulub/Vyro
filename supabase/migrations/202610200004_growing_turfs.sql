begin;

-- Competition writes are RPC-only. Ordinary workout sharing remains separate.
create table public.turfs (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(name) between 1 and 80),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  revision integer not null default 1 check(revision > 0),
  route jsonb not null check(public.valid_vyro_route(route)),
  distance_m double precision not null check(distance_m between 200 and 100000),
  seconds double precision not null check(seconds > 0),
  updated_at timestamptz not null default now()
);
create table public.turf_attempts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  local_id text not null check(char_length(local_id) between 1 and 120),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique(actor_id,local_id)
);
create table public.turf_events (
  id uuid primary key default gen_random_uuid(),
  turf_id uuid not null references public.turfs(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  previous_owner_id uuid references public.profiles(id) on delete set null,
  revision integer not null,
  extended boolean not null,
  distance_m double precision not null,
  seconds double precision not null,
  created_at timestamptz not null default now()
);
create index turf_events_recent on public.turf_events(created_at desc);
create index turfs_owner on public.turfs(owner_id);
alter table public.turfs enable row level security;
alter table public.turf_attempts enable row level security;
alter table public.turf_events enable row level security;
revoke all on public.turfs,public.turf_attempts,public.turf_events from public,anon,authenticated;
grant select on public.turfs,public.turf_attempts,public.turf_events to authenticated;
-- Opt-in competitive routes are explicitly shared with signed-in runners.
create policy turf_read on public.turfs for select to authenticated using (true);
create policy turf_event_read on public.turf_events for select to authenticated using (true);
create policy turf_attempt_read on public.turf_attempts for select to authenticated using (actor_id=(select auth.uid()));

create function public.turf_meters(a jsonb,b jsonb) returns double precision
language sql immutable set search_path='' as $$
  select 12742000 * asin(least(1.0,sqrt(
    power(sin(radians((b->>'latitude')::double precision-(a->>'latitude')::double precision)/2),2)
    + cos(radians((a->>'latitude')::double precision))*cos(radians((b->>'latitude')::double precision))
    *power(sin(radians((b->>'longitude')::double precision-(a->>'longitude')::double precision)/2),2)
  )))
$$;
revoke all on function public.turf_meters(jsonb,jsonb) from public,anon,authenticated;

-- Limited, monotonic trace matching. This checks submitted GPS evidence; it is
-- not device attestation and cannot prove that an untrusted phone really ran.
create function public.submit_turf_run(
  p_local_id text, p_name text, p_source text, p_sport text, p_samples jsonb,
  p_turf_id uuid default null, p_revision integer default null, p_extend boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); current_turf public.turfs; result jsonb;
  point jsonb; previous jsonb; route jsonb:='[]'; new_route jsonb;
  n integer; m integer; i integer; j integer:=0; first_i integer:=-1; last_i integer:=-1;
  d double precision; dt double precision; distance double precision:=0;
  matched_distance double precision:=0; extension_distance double precision:=0;
  matched_seconds double precision; new_seconds double precision; end_i integer;
  previous_owner uuid; win boolean; attempts integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_source is distinct from 'gps' or p_sport is distinct from 'Løping' then
    raise exception 'TURF_GPS_REQUIRED';
  end if;
  if p_local_id is null or char_length(p_local_id) not between 1 and 120
    or p_extend is null then raise exception 'TURF_INVALID'; end if;
  -- Serialize retries for the same account/workout before reading the receipt.
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_local_id,0));
  select a.result into result from public.turf_attempts a where a.actor_id=actor and a.local_id=p_local_id;
  if found then return result; end if;
  if p_samples is null or jsonb_typeof(p_samples)<>'array'
    or octet_length(p_samples::text)>3000000 then raise exception 'TURF_INVALID'; end if;
  n:=jsonb_array_length(p_samples);
  if n not between 2 and 20000 then raise exception 'TURF_INVALID'; end if;
  for i in 0..n-1 loop
    point:=p_samples->i;
    if jsonb_typeof(point)<>'object'
      or point - 'latitude' - 'longitude' - 'timestamp' - 'accuracy' <> '{}'::jsonb
      or jsonb_typeof(point->'latitude') is distinct from 'number'
      or jsonb_typeof(point->'longitude') is distinct from 'number'
      or jsonb_typeof(point->'timestamp') is distinct from 'number'
      or jsonb_typeof(point->'accuracy') is distinct from 'number' then raise exception 'TURF_INVALID'; end if;
    if (point->>'latitude')::numeric not between -90 and 90
      or (point->>'longitude')::numeric not between -180 and 180
      or (point->>'accuracy')::numeric not between 0 and 30
      or (point->>'timestamp')::numeric < extract(epoch from now()-interval '7 days')*1000
      or (point->>'timestamp')::numeric > extract(epoch from now())*1000+60000 then raise exception 'TURF_INVALID'; end if;
    if i>0 then
      dt:=((point->>'timestamp')::double precision-(previous->>'timestamp')::double precision)/1000;
      d:=public.turf_meters(previous,point);
      -- Long stationary pauses count in elapsed time; unobserved movement fails closed.
      if dt<=0 or dt>3600 or d>40 or d/dt>12 or (dt>15 and d>10) then raise exception 'TURF_GPS_GAP'; end if;
      distance:=distance+d;
    end if;
    previous:=point;
  end loop;
  if distance not between 200 and 100000 then raise exception 'TURF_DISTANCE'; end if;
  if p_turf_id is null then
    if p_extend or p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'TURF_INVALID'; end if;
    first_i:=0; last_i:=n-1; end_i:=last_i; win:=true;
    new_seconds:=((p_samples->end_i->>'timestamp')::double precision-(p_samples->0->>'timestamp')::double precision)/1000;
  else
    select * into current_turf from public.turfs where id=p_turf_id for update;
    if not found then raise exception 'TURF_NOT_FOUND'; end if;
    if p_revision is distinct from current_turf.revision then raise exception 'TURF_CHANGED'; end if;
    if current_turf.owner_id=actor then raise exception 'TURF_ALREADY_OWNER'; end if;
    m:=jsonb_array_length(current_turf.route);
    for i in 0..n-1 loop
      point:=p_samples->i;
      if first_i<0 then
        if public.turf_meters(point,current_turf.route->0)>15 then continue; end if;
        first_i:=i;
      end if;
      -- A sample can advance several closely spaced checkpoints, never backwards.
      while j<m-1 and public.turf_meters(point,current_turf.route->(j+1))<=25 loop j:=j+1; end loop;
      if public.turf_meters(point,current_turf.route->j)>35 then raise exception 'TURF_WRONG_ROUTE'; end if;
      if i>first_i then matched_distance:=matched_distance+public.turf_meters(p_samples->(i-1),point); end if;
      if j=m-1 and public.turf_meters(point,current_turf.route->(m-1))<=15 then last_i:=i; exit; end if;
    end loop;
    if last_i<0 or matched_distance<current_turf.distance_m*0.95
      or matched_distance>current_turf.distance_m*1.10 then raise exception 'TURF_WRONG_ROUTE'; end if;
    matched_seconds:=((p_samples->last_i->>'timestamp')::double precision-(p_samples->first_i->>'timestamp')::double precision)/1000;
    if matched_seconds<=0 then raise exception 'TURF_INVALID'; end if;
    win:=matched_seconds<current_turf.seconds;
    if p_extend and not win then raise exception 'TURF_NOT_FASTER'; end if;
    end_i:=case when p_extend then n-1 else last_i end;
    if p_extend then
      for i in last_i+1..n-1 loop extension_distance:=extension_distance+public.turf_meters(p_samples->(i-1),p_samples->i); end loop;
      if extension_distance<100 then raise exception 'TURF_EXTENSION_SHORT'; end if;
    end if;
    new_seconds:=((p_samples->end_i->>'timestamp')::double precision-(p_samples->first_i->>'timestamp')::double precision)/1000;
    previous_owner:=current_turf.owner_id;
  end if;
  -- 5 accepted submissions per minute. Rejections do not mutate ownership.
  insert into public.write_limits as limits(actor,action,bucket,attempts)
    values(actor,'turf',date_trunc('minute',now()),1)
    on conflict on constraint write_limits_pkey do update set bucket=excluded.bucket,
      attempts=case when limits.bucket=excluded.bucket then limits.attempts+1 else 1 end
    returning limits.attempts into attempts;
  if attempts>5 then raise exception 'Too many turf submissions' using errcode='P0001'; end if;
  if win then
    if p_turf_id is null then
      -- Retain geometry, never accuracy or timestamps. Simplify tiny jitter.
      for i in first_i..end_i loop
        point:=p_samples->i;
        if i=first_i or i=end_i or public.turf_meters(route->-1,point)>=10 then
          route:=route||jsonb_build_array(point-'timestamp'-'accuracy');
        end if;
      end loop;
      distance:=0;
      for i in 1..jsonb_array_length(route)-1 loop distance:=distance+public.turf_meters(route->(i-1),route->i); end loop;
      insert into public.turfs(name,owner_id,route,distance_m,seconds)
        values(btrim(p_name),actor,route,distance,new_seconds) returning * into current_turf;
    else
      route:=current_turf.route;
      if p_extend then
        -- The defeated course remains the exact prefix; extension is appended.
        for i in last_i+1..end_i loop
          point:=p_samples->i;
          if i=end_i or public.turf_meters(route->-1,point)>=10 then
            route:=route||jsonb_build_array(point-'timestamp'-'accuracy');
          end if;
        end loop;
      end if;
      distance:=0;
      for i in 1..jsonb_array_length(route)-1 loop distance:=distance+public.turf_meters(route->(i-1),route->i); end loop;
      new_route:=route;
      update public.turfs set owner_id=actor,revision=revision+1,route=new_route,
        distance_m=distance,seconds=new_seconds,updated_at=now()
        where id=current_turf.id returning * into current_turf;
    end if;
    insert into public.turf_events(turf_id,actor_id,previous_owner_id,revision,extended,distance_m,seconds)
      values(current_turf.id,actor,previous_owner,current_turf.revision,p_extend,current_turf.distance_m,current_turf.seconds);
  end if;
  result:=jsonb_build_object('turf_id',current_turf.id,'won',win,'extended',win and p_extend,
    'revision',current_turf.revision,'seconds',coalesce(matched_seconds,new_seconds),
    'target_seconds',current_turf.seconds,'distance_m',current_turf.distance_m);
  insert into public.turf_attempts(actor_id,local_id,turf_id,result) values(actor,p_local_id,current_turf.id,result);
  return result;
end $$;
revoke all on function public.submit_turf_run(text,text,text,text,jsonb,uuid,integer,boolean) from public,anon;
grant execute on function public.submit_turf_run(text,text,text,text,jsonb,uuid,integer,boolean) to authenticated;
-- Owners can withdraw their competitive route; cascades remove its events/receipts.
grant delete on public.turfs to authenticated;
create policy turf_withdraw on public.turfs for delete to authenticated using(owner_id=(select auth.uid()));
commit;
