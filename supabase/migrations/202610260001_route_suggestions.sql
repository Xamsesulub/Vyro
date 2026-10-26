begin;
-- Public route geometry has no owner or link to the person who searched for it.
create table public.route_suggestions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  name text not null check (length(name) between 1 and 120),
  sport text not null check (sport in ('Løping','Gange','Fottur')),
  route jsonb not null check (public.valid_vyro_route(route) and octet_length(route::text)<1500000),
  distance_m numeric not null check (distance_m between 1800 and 22500),
  ascent_m numeric check (ascent_m between 0 and 20000),
  source text not null check (source='openrouteservice'),
  attribution text not null check (length(attribution) between 1 and 200),
  created_at timestamptz not null default now()
);
alter table public.route_suggestions enable row level security;
revoke all on public.route_suggestions from public,anon,authenticated;
grant select on public.route_suggestions to authenticated;
create policy route_suggestions_read on public.route_suggestions for select to authenticated using(true);

create table public.saved_route_suggestions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  route_id text not null references public.route_suggestions(id) on delete restrict,
  name text not null check(length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key(owner_id,route_id)
);
create index saved_route_suggestions_page on public.saved_route_suggestions(owner_id,created_at desc,route_id);
alter table public.saved_route_suggestions enable row level security;
revoke all on public.saved_route_suggestions from public,anon,authenticated;
grant select,delete on public.saved_route_suggestions to authenticated;
create policy saved_route_read on public.saved_route_suggestions for select to authenticated using(owner_id=(select auth.uid()));
create policy saved_route_delete on public.saved_route_suggestions for delete to authenticated using(owner_id=(select auth.uid()));

create function public.save_route_suggestion(p_route_id text,p_name text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('save-route:'||actor::text,0));
  if exists(select 1 from public.saved_route_suggestions where owner_id=actor and route_id=p_route_id) then
    update public.saved_route_suggestions set name=coalesce(nullif(btrim(p_name),''),name) where owner_id=actor and route_id=p_route_id;
    return;
  end if;
  if (select count(*) from public.saved_route_suggestions where owner_id=actor)>=500 then raise exception 'ROUTE_LIBRARY_FULL'; end if;
  insert into public.saved_route_suggestions(owner_id,route_id,name)
    values(actor,p_route_id,coalesce(nullif(btrim(p_name),''),(select name from public.route_suggestions where id=p_route_id)));
end $$;
revoke all on function public.save_route_suggestion(text,text) from public,anon;
grant execute on function public.save_route_suggestion(text,text) to authenticated;
create trigger limit_saved_route_suggestions before insert on public.saved_route_suggestions for each row execute function public.limit_vyro_write();

-- Only service-role functions may access cache coordination / rate counters.
create table public.route_search_requests(owner_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create index route_search_requests_owner on public.route_search_requests(owner_id,created_at);
create index route_search_requests_age on public.route_search_requests(created_at);
create table public.route_generation_requests(created_at timestamptz not null default now());
create index route_generation_requests_age on public.route_generation_requests(created_at);
alter table public.route_generation_requests enable row level security;
revoke all on public.route_generation_requests from public,anon,authenticated;
create table public.route_search_cache (
  key text primary key check(length(key) between 5 and 120),
  lease uuid, lease_until timestamptz, expires_at timestamptz,
  route_ids text[] not null default '{}', updated_at timestamptz not null default now()
);
alter table public.route_search_requests enable row level security;
alter table public.route_search_cache enable row level security;
revoke all on public.route_search_requests,public.route_search_cache from public,anon,authenticated;

create function public.vyro_claim_route_search(p_owner uuid,p_key text,p_minute integer default 30,p_day integer default 600) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cached public.route_search_cache; token uuid:=gen_random_uuid(); result jsonb;
begin
  if p_owner is null or p_key is null or length(p_key) not between 5 and 120 then raise exception 'INVALID_QUERY'; end if;
  perform pg_advisory_xact_lock(hashtextextended('route-user:'||p_owner::text,0));
  delete from public.route_search_requests where owner_id=p_owner and created_at<now()-interval '1 day';
  if (select count(*) from public.route_search_requests where owner_id=p_owner and created_at>now()-interval '1 minute')>=6
    or (select count(*) from public.route_search_requests where owner_id=p_owner)>=60 then raise exception 'ROUTE_RATE_LIMIT'; end if;
  insert into public.route_search_requests(owner_id) values(p_owner);
  perform pg_advisory_xact_lock(hashtextextended('route-cache:'||p_key,0));
  select * into cached from public.route_search_cache where key=p_key for update;
  if cached.expires_at>now() then
    select coalesce(jsonb_agg(to_jsonb(r) order by i.ordinality),'[]') into result from unnest(cached.route_ids) with ordinality i(id,ordinality) join public.route_suggestions r on r.id=i.id;
    return jsonb_build_object('state','ready','routes',result);
  end if;
  if cached.lease_until>now() then return jsonb_build_object('state','pending'); end if;
  -- Each generated set makes at most three provider requests. Protect the
  -- shared API quota across all users and Edge Function instances.
  if p_minute is null or p_day is null or p_minute not between 3 and 100000 or p_day not between 3 and 10000000 then raise exception 'INVALID_BUDGET'; end if;
  perform pg_advisory_xact_lock(hashtextextended('route-provider-budget',0));
  delete from public.route_generation_requests where created_at<now()-interval '1 day';
  if (select count(*)*3+3 from public.route_generation_requests where created_at>now()-interval '1 minute')>p_minute
    or (select count(*)*3+3 from public.route_generation_requests)>p_day then raise exception 'ROUTE_PROVIDER_BUDGET'; end if;
  insert into public.route_generation_requests default values;
  insert into public.route_search_cache(key,lease,lease_until) values(p_key,token,now()+interval '60 seconds')
    on conflict(key) do update set lease=excluded.lease,lease_until=excluded.lease_until,updated_at=now();
  return jsonb_build_object('state','generate','lease',token);
end $$;
revoke all on function public.vyro_claim_route_search(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.vyro_claim_route_search(uuid,text,integer,integer) to service_role;

create function public.vyro_finish_route_search(p_key text,p_lease uuid,p_routes jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; ids text[]:='{}'; result jsonb;
begin
  perform 1 from public.route_search_cache where key=p_key and lease=p_lease and lease_until>now() for update;
  if not found then raise exception 'ROUTE_LEASE_EXPIRED'; end if;
  if p_routes is null then
    update public.route_search_cache set lease=null,lease_until=null,updated_at=now() where key=p_key;
    return '[]';
  end if;
  if jsonb_typeof(p_routes) <> 'array' or jsonb_array_length(p_routes)>3 or octet_length(p_routes::text)>2500000 then raise exception 'INVALID_ROUTES'; end if;
  for item in select value from jsonb_array_elements(p_routes) loop
    insert into public.route_suggestions(id,name,sport,route,distance_m,ascent_m,source,attribution)
      values(item->>'id',item->>'name',item->>'sport',item->'route',(item->>'distance_m')::numeric,(item->>'ascent_m')::numeric,item->>'source',item->>'attribution')
      on conflict(id) do nothing;
    ids:=array_append(ids,item->>'id');
  end loop;
  update public.route_search_cache set lease=null,lease_until=null,route_ids=ids,updated_at=now(),
    expires_at=now()+case when cardinality(ids)=0 then interval '15 minutes' else interval '1 day' end where key=p_key;
  select coalesce(jsonb_agg(to_jsonb(r) order by i.ordinality),'[]') into result from unnest(ids) with ordinality i(id,ordinality) join public.route_suggestions r on r.id=i.id;
  return result;
end $$;
revoke all on function public.vyro_finish_route_search(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.vyro_finish_route_search(text,uuid,jsonb) to service_role;

create function public.vyro_prune_route_suggestions() returns void
language plpgsql security definer set search_path='' as $$
begin
  delete from public.route_search_requests where created_at<now()-interval '2 days';
  delete from public.route_generation_requests where created_at<now()-interval '2 days';
  delete from public.route_search_cache where greatest(coalesce(expires_at,updated_at),coalesce(lease_until,updated_at))<now()-interval '2 days';
  delete from public.route_suggestions r where r.created_at<now()-interval '30 days'
    and not exists(select 1 from public.saved_route_suggestions s where s.route_id=r.id)
    and not exists(select 1 from public.route_search_cache c where r.id=any(c.route_ids));
end $$;
revoke all on function public.vyro_prune_route_suggestions() from public,anon,authenticated;
grant execute on function public.vyro_prune_route_suggestions() to service_role;
commit;
