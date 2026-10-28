begin;

-- Existing accounts keep their current visibility. Private is an explicit choice.
alter table public.profiles add column is_private boolean not null default false;
alter table public.profiles add column avatar_path text;
alter table public.profiles add constraint profile_avatar_path check (
  avatar_path is null or avatar_path ~ ('^'||id::text||'/[0-9a-f-]{36}\.jpg$')
);
grant update(is_private) on public.profiles to authenticated;

create table public.follow_requests (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(requester_id,recipient_id), check(requester_id<>recipient_id)
);
create index follow_requests_recipient on public.follow_requests(recipient_id,created_at desc);
alter table public.follow_requests enable row level security;
revoke all on public.follow_requests from public,anon,authenticated;
grant select on public.follow_requests to authenticated;
create policy requests_participants on public.follow_requests for select to authenticated
  using(requester_id=(select auth.uid()) or recipient_id=(select auth.uid()));
create trigger limit_follow_requests before insert on public.follow_requests
  for each row execute function public.limit_vyro_write();

create table public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('follow','request','accepted')),
  created_at timestamptz not null default now(), read_at timestamptz,
  unique(recipient_id,actor_id,kind), check(recipient_id<>actor_id)
);
create index social_notifications_inbox on public.social_notifications(recipient_id,created_at desc,id desc);
alter table public.social_notifications enable row level security;
revoke all on public.social_notifications from public,anon,authenticated;
grant select,update(read_at) on public.social_notifications to authenticated;
create policy notification_read on public.social_notifications for select to authenticated using(recipient_id=(select auth.uid()));
create policy notification_seen on public.social_notifications for update to authenticated
  using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));

-- A follow/unfollow loop must not repeatedly alert the same person.
create function public.vyro_notify(p_recipient uuid,p_actor uuid,p_kind text) returns void
language sql security definer set search_path='' as $$
  insert into public.social_notifications as n(recipient_id,actor_id,kind)
    values(p_recipient,p_actor,p_kind)
  on conflict(recipient_id,actor_id,kind) do update set created_at=now(),read_at=null
    where n.created_at < now()-interval '24 hours'
$$;
revoke all on function public.vyro_notify(uuid,uuid,text) from public,anon,authenticated;
create function public.vyro_follow_notice() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform public.vyro_notify(new.following_id,new.follower_id,'follow');
  return new;
end $$;
revoke all on function public.vyro_follow_notice() from public,anon,authenticated;
create trigger follow_notice after insert on public.follows for each row execute function public.vyro_follow_notice();

-- Old clients cannot bypass a private account by directly inserting a follow.
drop policy follows_add on public.follows;
create policy follows_add on public.follows for insert to authenticated with check (
  follower_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=following_id and not p.is_private)
);
drop policy follows_remove on public.follows;
create policy follows_remove on public.follows for delete to authenticated
  using(follower_id=(select auth.uid()) or following_id=(select auth.uid()));

create function public.vyro_follow(p_target uuid,p_follow boolean default true) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); private boolean;
begin
  if actor is null or actor=p_target then raise exception 'Invalid actor' using errcode='42501'; end if;
  -- Serialize against privacy changes and request decisions for this recipient.
  select is_private into private from public.profiles where id=p_target for update;
  if not found then raise exception 'Profile missing' using errcode='22023'; end if;
  if not p_follow then
    delete from public.follow_requests where requester_id=actor and recipient_id=p_target;
    delete from public.follows where follower_id=actor and following_id=p_target;
    return 'none';
  end if;
  if exists(select 1 from public.follows where follower_id=actor and following_id=p_target) then return 'following'; end if;
  if private then
    insert into public.follow_requests(requester_id,recipient_id) values(actor,p_target) on conflict do nothing;
    perform public.vyro_notify(p_target,actor,'request');
    return 'requested';
  end if;
  delete from public.follow_requests where requester_id=actor and recipient_id=p_target;
  insert into public.follows(follower_id,following_id) values(actor,p_target) on conflict do nothing;
  return 'following';
end $$;
revoke all on function public.vyro_follow(uuid,boolean) from public,anon;
grant execute on function public.vyro_follow(uuid,boolean) to authenticated;

create function public.vyro_respond_follow(p_requester uuid,p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from public.profiles where id=actor for update;
  delete from public.follow_requests where requester_id=p_requester and recipient_id=actor;
  if found and p_accept then
    insert into public.follows(follower_id,following_id) values(p_requester,actor) on conflict do nothing;
    perform public.vyro_notify(p_requester,actor,'accepted');
  end if;
  update public.social_notifications set read_at=now() where recipient_id=actor and actor_id=p_requester and kind='request';
end $$;
revoke all on function public.vyro_respond_follow(uuid,boolean) from public,anon;
grant execute on function public.vyro_respond_follow(uuid,boolean) to authenticated;

-- Invoker feeds and nested reactions inherit this rule, even for old public posts.
create function public.vyro_can_read_social(p_author uuid,p_audience text) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (p_author=auth.uid() or
    exists(select 1 from public.follows where follower_id=auth.uid() and following_id=p_author) or
    (p_audience='everyone' and exists(select 1 from public.profiles where id=p_author and not is_private)))
$$;
revoke all on function public.vyro_can_read_social(uuid,text) from public,anon;
grant execute on function public.vyro_can_read_social(uuid,text) to authenticated;
drop policy posts_read on public.posts;
create policy posts_read on public.posts for select to authenticated using(public.vyro_can_read_social(author_id,audience));
drop policy place_posts_read on public.place_posts;
create policy place_posts_read on public.place_posts for select to authenticated using(public.vyro_can_read_social(author_id,audience));

-- Avatars are discoverable profile information, never a public bucket.
do $$ begin
  if to_regclass('storage.objects') is null then return; end if;
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
    values('profile-photos','profile-photos',false,2097152,array['image/jpeg']);
  create policy profile_photo_insert on storage.objects for insert to authenticated with check (
    bucket_id='profile-photos' and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f-]{36}\.jpg$'));
  create policy profile_photo_read on storage.objects for select to authenticated using (
    bucket_id='profile-photos' and (split_part(name,'/',1)=(select auth.uid())::text or
      exists(select 1 from public.profiles where avatar_path=name)));
  create policy profile_photo_delete on storage.objects for delete to authenticated using (
    bucket_id='profile-photos' and split_part(name,'/',1)=(select auth.uid())::text and
    not exists(select 1 from public.profiles where avatar_path=name));
end $$;
create function public.vyro_set_avatar(p_path text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); uploaded boolean;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_path is not null then
    if p_path !~ ('^'||actor::text||'/[0-9a-f-]{36}\.jpg$') then raise exception 'Invalid photo path' using errcode='22023'; end if;
    execute 'select exists(select 1 from storage.objects where bucket_id=''profile-photos'' and name=$1)' into uploaded using p_path;
    if not uploaded then raise exception 'Upload first' using errcode='22023'; end if;
  end if;
  update public.profiles set avatar_path=p_path where id=actor;
end $$;
revoke all on function public.vyro_set_avatar(text) from public,anon;
grant execute on function public.vyro_set_avatar(text) to authenticated;
create or replace function public.vyro_feed(
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
    select p.*, jsonb_build_object('id',u.id,'username',u.username,'display_name',u.display_name,'avatar_path',u.avatar_path,'is_private',u.is_private),
      (select count(*) from public.likes l where l.post_id=p.id),
      exists(select 1 from public.likes l where l.post_id=p.id and l.user_id=actor),
      exists(select 1 from public.reposts r where r.post_id=p.id and r.user_id=actor)
    from page p join public.profiles u on u.id=p.author_id
    order by p.created_at desc,p.id desc;
end $$;
revoke all on function public.vyro_feed(text,integer,timestamptz,uuid) from public,anon;
grant execute on function public.vyro_feed(text,integer,timestamptz,uuid) to authenticated;

create or replace function public.vyro_home_feed(p_kind text default 'following',p_limit integer default 20,
  p_before_created_at timestamptz default null,p_before_id uuid default null)
returns table(post jsonb) language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_kind is null or p_kind not in ('following','reposted') or
    (p_before_created_at is null)<>(p_before_id is null) then raise exception 'Invalid cursor' using errcode='22023'; end if;
  return query select mixed.body from (
    select f.created_at,f.id,to_jsonb(f)||jsonb_build_object('kind','workout') body
      from public.vyro_feed(p_kind,p_limit,p_before_created_at,p_before_id) f
    union all
    select p.created_at,p.id,to_jsonb(p)||jsonb_build_object('kind','place','profiles',
      jsonb_build_object('id',u.id,'username',u.username,'display_name',u.display_name,'avatar_path',u.avatar_path,'is_private',u.is_private))
      from public.place_posts p join public.profiles u on u.id=p.author_id
      where p_kind='following' and (p.author_id=(select auth.uid()) or exists(
        select 1 from public.follows where follower_id=(select auth.uid()) and following_id=p.author_id))
      and (p_before_created_at is null or (p.created_at,p.id)<(p_before_created_at,p_before_id))
  ) mixed order by mixed.created_at desc,mixed.id desc limit greatest(1,least(coalesce(p_limit,20),31));
end $$;
revoke all on function public.vyro_home_feed(text,integer,timestamptz,uuid) from public,anon;
grant execute on function public.vyro_home_feed(text,integer,timestamptz,uuid) to authenticated;

commit;