begin;

-- Match the stable cursor ordering and the filters used by the feed.
create index posts_created_id_idx on public.posts(created_at desc, id desc);
create index posts_author_created_id_idx on public.posts(author_id, created_at desc, id desc);
create index turf_events_actor_created_idx on public.turf_events(actor_id, created_at desc, id desc);
create index turfs_updated_idx on public.turfs(updated_at desc, id desc);
-- Cover referencing columns so deletes do not scan growing child tables.
create index turf_attempts_turf_idx on public.turf_attempts(turf_id);
create index turf_events_turf_idx on public.turf_events(turf_id);
create index turf_events_previous_owner_idx on public.turf_events(previous_owner_id);
create index comments_author_idx on public.comments(author_id);

-- One bounded request replaces follow-ID downloads and three reaction requests
-- per post. Large route JSON is fetched separately only when a map is opened.
-- SECURITY INVOKER deliberately preserves the existing follower/privacy RLS.
create function public.vyro_feed(
  p_kind text default 'following',
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
) returns table (
  id uuid, author_id uuid, title text, sport text, distance_km numeric,
  seconds integer, recorded_at timestamptz, created_at timestamptz,
  audience text, profiles jsonb, like_count bigint, liked boolean, reposted boolean
) language plpgsql stable security invoker set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_kind is null or p_kind not in ('following','reposted')
    or (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Invalid feed cursor or kind' using errcode='22023';
  end if;
  return query
    with page as materialized (
      select p.id, p.author_id, p.title, p.sport, p.distance_km, p.seconds,
        p.recorded_at, p.created_at, p.audience
      from public.posts p
      where (
        (p_kind='following' and (p.author_id=actor or exists (
          select 1 from public.follows f where f.follower_id=actor and f.following_id=p.author_id
        ))) or (p_kind='reposted' and exists (
          select 1 from public.reposts r where r.user_id=actor and r.post_id=p.id
        ))
      ) and (p_before_created_at is null or (p.created_at,p.id)<(p_before_created_at,p_before_id))
      order by p.created_at desc, p.id desc
      limit greatest(1,least(coalesce(p_limit,20),31))
    )
    select p.*, jsonb_build_object('id',u.id,'username',u.username,'display_name',u.display_name),
      (select count(*) from public.likes l where l.post_id=p.id),
      exists(select 1 from public.likes l where l.post_id=p.id and l.user_id=actor),
      exists(select 1 from public.reposts r where r.post_id=p.id and r.user_id=actor)
    from page p join public.profiles u on u.id=p.author_id
    order by p.created_at desc,p.id desc;
end $$;
revoke all on function public.vyro_feed(text,integer,timestamptz,uuid) from public,anon;
grant execute on function public.vyro_feed(text,integer,timestamptz,uuid) to authenticated;

create function public.vyro_turf_events()
returns table(id uuid, turf_id uuid, distance_m double precision, extended boolean, actor jsonb, previous jsonb)
language sql stable security invoker set search_path = '' as $$
  select e.id,e.turf_id,e.distance_m,e.extended,
    jsonb_build_object('display_name',a.display_name),
    case when p.id is null then null else jsonb_build_object('display_name',p.display_name) end
  from public.turf_events e
  join public.profiles a on a.id=e.actor_id
  left join public.profiles p on p.id=e.previous_owner_id
  where (select auth.uid()) is not null and (e.actor_id=(select auth.uid()) or exists (
    select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.following_id=e.actor_id
  ))
  order by e.created_at desc,e.id desc limit 3
$$;
revoke all on function public.vyro_turf_events() from public,anon;
grant execute on function public.vyro_turf_events() to authenticated;

commit;
