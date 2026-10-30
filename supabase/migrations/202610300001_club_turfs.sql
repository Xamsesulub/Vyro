begin;

-- Historical zones are retained privately. Joining a club never republishes them.
alter table public.turfs add column club_id uuid references public.clubs(id) on delete cascade;
create index turfs_club_updated on public.turfs(club_id,updated_at desc,id);
create index turfs_club_owner on public.turfs(club_id,owner_id);
drop policy turf_read on public.turfs;
create policy turf_read on public.turfs for select to authenticated using (
  (club_id is null and owner_id=(select auth.uid())) or
  (club_id is not null and public.vyro_club_member(club_id)
    and public.vyro_visible_person(owner_id)
    and exists(select 1 from public.club_members m where m.club_id=turfs.club_id and m.user_id=turfs.owner_id))
);
drop policy turf_event_read on public.turf_events;
create policy turf_event_read on public.turf_events for select to authenticated using (
  exists(select 1 from public.turfs t where t.id=turf_id and t.club_id is not null)
  and public.vyro_visible_person(actor_id)
  and (previous_owner_id is null or public.vyro_visible_person(previous_owner_id))
);

-- Keep the proven GPS validator and row/revision locks, but remove the public
-- entry point that could create unscoped zones. Only this wrapper may call it.
revoke all on function public.submit_turf_run(text,text,text,text,jsonb,uuid,integer,boolean) from public,anon,authenticated;
create function public.submit_club_turf_run(
  p_club_id uuid,p_local_id text,p_name text,p_source text,p_sport text,p_samples jsonb,
  p_turf_id uuid default null,p_revision integer default null,p_extend boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt jsonb; target public.turfs; result jsonb;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- A concurrent leave/removal must wait until this submission commits.
  perform 1 from public.club_members where club_id=p_club_id and user_id=actor for key share;
  if not found then raise exception 'TURF_CLUB_MEMBERSHIP' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_local_id,0));
  select a.result into receipt from public.turf_attempts a where a.actor_id=actor and a.local_id=p_local_id;
  if found then
    if not exists(select 1 from public.turfs t where t.id=(receipt->>'turf_id')::uuid and t.club_id=p_club_id) then
      raise exception 'TURF_WORKOUT_OTHER_CLUB';
    end if;
    return receipt;
  end if;
  if p_turf_id is not null then
    select * into target from public.turfs where id=p_turf_id and club_id=p_club_id;
    if not found or not public.vyro_visible_person(target.owner_id) then raise exception 'TURF_NOT_FOUND'; end if;
    perform 1 from public.club_members where club_id=p_club_id and user_id=target.owner_id for key share;
    if not found then raise exception 'TURF_NOT_FOUND'; end if;
  end if;
  result:=public.submit_turf_run(p_local_id,p_name,p_source,p_sport,p_samples,p_turf_id,p_revision,p_extend);
  if p_turf_id is null then
    update public.turfs set club_id=p_club_id where id=(result->>'turf_id')::uuid;
  end if;
  return result;
end $$;
revoke all on function public.submit_club_turf_run(uuid,text,text,text,text,jsonb,uuid,integer,boolean) from public,anon;
grant execute on function public.submit_club_turf_run(uuid,text,text,text,text,jsonb,uuid,integer,boolean) to authenticated;

-- Bounded map geometry only; the full, verified course remains in turf details.
create function public.vyro_club_turfs(p_club_id uuid,p_before_updated timestamptz default null,p_before_id uuid default null)
returns table(id uuid,name text,owner_id uuid,club_id uuid,revision integer,distance_m double precision,
 seconds double precision,updated_at timestamptz,route jsonb,profiles jsonb)
language plpgsql stable security invoker set search_path='' as $$
begin
  if not public.vyro_club_member(p_club_id) then raise exception 'TURF_CLUB_MEMBERSHIP' using errcode='42501'; end if;
  if (p_before_updated is null)<>(p_before_id is null) then raise exception 'Invalid cursor'; end if;
  return query select t.id,t.name,t.owner_id,t.club_id,t.revision,t.distance_m,t.seconds,t.updated_at,
    (select jsonb_agg(p.value order by p.ord) from jsonb_array_elements(t.route) with ordinality p(value,ord)
      where p.ord=1 or p.ord=jsonb_array_length(t.route)
      or mod(p.ord-1,greatest(1,ceil(jsonb_array_length(t.route)/180.0)::int))=0),
    jsonb_build_object('display_name',a.display_name,'avatar_path',a.avatar_path)
    from public.turfs t join public.profiles a on a.id=t.owner_id where t.club_id=p_club_id
    and (p_before_updated is null or t.updated_at<p_before_updated or (t.updated_at=p_before_updated and t.id>p_before_id))
    order by t.updated_at desc,t.id limit 41;
end $$;

create function public.vyro_club_turf_results(p_club_id uuid,p_offset integer default 0)
returns table(user_id uuid,display_name text,avatar_path text,zones bigint,distance_m double precision,place bigint)
language plpgsql stable security invoker set search_path='' as $$
begin
  if not public.vyro_club_member(p_club_id) then raise exception 'TURF_CLUB_MEMBERSHIP' using errcode='42501'; end if;
  return query with scores as (
    select m.user_id,p.display_name,p.avatar_path,count(t.id) as zones,coalesce(sum(t.distance_m),0)::double precision as distance_m
    from public.club_members m join public.profiles p on p.id=m.user_id
    left join public.turfs t on t.club_id=m.club_id and t.owner_id=m.user_id
    where m.club_id=p_club_id group by m.user_id,p.display_name,p.avatar_path
  ) select s.*,rank() over(order by s.zones desc,s.distance_m desc) from scores s
    order by s.zones desc,s.distance_m desc,lower(s.display_name),s.user_id
    limit 51 offset greatest(0,coalesce(p_offset,0));
end $$;
revoke all on function public.vyro_club_turfs(uuid,timestamptz,uuid),public.vyro_club_turf_results(uuid,integer) from public,anon;
grant execute on function public.vyro_club_turfs(uuid,timestamptz,uuid),public.vyro_club_turf_results(uuid,integer) to authenticated;

-- RLS applies here too: events now follow club membership, never follower count.
create or replace function public.vyro_turf_events()
returns table(id uuid,turf_id uuid,distance_m double precision,extended boolean,actor jsonb,previous jsonb)
language sql stable security invoker set search_path='' as $$
  select e.id,e.turf_id,e.distance_m,e.extended,jsonb_build_object('display_name',a.display_name),
    case when p.id is null then null else jsonb_build_object('display_name',p.display_name) end
  from public.turf_events e join public.profiles a on a.id=e.actor_id
  left join public.profiles p on p.id=e.previous_owner_id
  order by e.created_at desc,e.id desc limit 3
$$;
notify pgrst,'reload schema';
commit;
