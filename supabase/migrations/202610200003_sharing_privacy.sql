begin;
alter table public.posts add column audience text not null default 'everyone'
  check (audience in ('followers','everyone'));
alter table public.posts alter column audience set default 'followers';
drop policy posts_read on public.posts;
create policy posts_read on public.posts for select to authenticated using (
  author_id = (select auth.uid()) or audience='everyone' or exists (
    select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.following_id=author_id
  )
);
do $$
declare t text; actor text;
begin
  foreach t in array array['likes','reposts','comments'] loop
    actor := case when t='comments' then 'author_id' else 'user_id' end;
    execute format('drop policy %I on public.%I',t||'_read',t);
    execute format('drop policy %I on public.%I',t||'_add',t);
    execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.posts p where p.id=post_id))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (%I=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id))',t||'_add',t,actor);
  end loop;
end $$;
drop function public.publish_workout(text,text,text,numeric,integer,timestamptz,text,jsonb);
create function public.publish_workout(
  p_local_id text, p_title text, p_sport text, p_distance_km numeric,
  p_seconds integer, p_recorded_at timestamptz, p_source text, p_route jsonb, p_audience text default 'followers'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); activity public.activities; post_id uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_source is distinct from 'gps' then raise exception 'Only GPS workouts may be shared'; end if;
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
commit;

