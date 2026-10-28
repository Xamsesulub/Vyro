begin;

-- Account-wide category preferences; device permission remains a separate opt-in.
create table public.notification_preferences (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check(category in ('followers','comments','likes','posts')),
  in_app boolean not null default true, push boolean not null default true,
  primary key(owner_id,category)
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public,anon,authenticated;
grant select,insert on public.notification_preferences to authenticated;
grant update on public.notification_preferences to authenticated;
create policy preferences_own on public.notification_preferences for all to authenticated
  using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create function public.vyro_notice_preference(p_owner uuid,p_kind text,p_push boolean) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((select case when p_push then p.push else p.in_app end
    from public.notification_preferences p where p.owner_id=p_owner and p.category=
      case p_kind when 'comment' then 'comments' when 'like' then 'likes' when 'post' then 'posts' else 'followers' end),
    not (p_push and p_kind='post'))
$$;
revoke all on function public.vyro_notice_preference(uuid,text,boolean) from public,anon,authenticated;

alter table public.social_notifications drop constraint social_notifications_kind_check;
alter table public.social_notifications add constraint social_notifications_kind_check
  check(kind in ('follow','request','accepted','comment','like','post'));
alter table public.social_notifications drop constraint social_notifications_recipient_id_actor_id_kind_key;
alter table public.social_notifications
  add column in_app boolean not null default true,
  add column post_id uuid references public.posts(id) on delete cascade,
  add column place_post_id uuid references public.place_posts(id) on delete cascade,
  add column comment_id uuid references public.comments(id) on delete cascade,
  add constraint notification_target check(
    (kind in ('follow','request','accepted') and post_id is null and place_post_id is null and comment_id is null) or
    (kind='post' and num_nonnulls(post_id,place_post_id)=1 and comment_id is null) or
    (kind='like' and post_id is not null and place_post_id is null and comment_id is null) or
    (kind='comment' and post_id is not null and place_post_id is null and comment_id is not null));
create unique index notice_follow_unique on public.social_notifications(recipient_id,actor_id,kind)
  where kind in ('follow','request','accepted');
create unique index notice_post_unique on public.social_notifications(recipient_id,actor_id,kind,post_id)
  where post_id is not null;
create unique index notice_place_unique on public.social_notifications(recipient_id,actor_id,kind,place_post_id)
  where place_post_id is not null;
create index notice_post_cleanup on public.social_notifications(post_id) where post_id is not null;
create index notice_place_cleanup on public.social_notifications(place_post_id) where place_post_id is not null;
create index notice_comment_cleanup on public.social_notifications(comment_id) where comment_id is not null;

-- Called only by server code. Re-check source existence and current access, including
-- unfollows, removed followers, unlikes and deleted comments, before push delivery.
create function public.vyro_notice_source_available(p_notice uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.social_notifications n where n.id=p_notice and (
    n.kind in ('follow','request','accepted') or
    (n.kind='post' and exists(select 1 from public.follows f
      where f.follower_id=n.recipient_id and f.following_id=n.actor_id) and (
        exists(select 1 from public.posts p where p.id=n.post_id and p.author_id=n.actor_id) or
        exists(select 1 from public.place_posts p where p.id=n.place_post_id and p.author_id=n.actor_id))) or
    (n.kind in ('like','comment') and exists(select 1 from public.posts p
      where p.id=n.post_id and p.author_id=n.recipient_id) and (
        (n.kind='like' and exists(select 1 from public.likes l where l.post_id=n.post_id and l.user_id=n.actor_id)) or
        (n.kind='comment' and exists(select 1 from public.comments c where c.id=n.comment_id
          and c.post_id=n.post_id and c.author_id=n.actor_id))))
  ))
$$;
revoke all on function public.vyro_notice_source_available(uuid) from public,anon,authenticated;
create function public.vyro_notice_visible(p_notice uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.social_notifications n where n.id=p_notice and n.recipient_id=auth.uid()
    and n.in_app and public.vyro_notice_source_available(n.id))
$$;
revoke all on function public.vyro_notice_visible(uuid) from public,anon;
grant execute on function public.vyro_notice_visible(uuid) to authenticated;
drop policy notification_read on public.social_notifications;
create policy notification_read on public.social_notifications for select to authenticated
  using(recipient_id=(select auth.uid()) and in_app and public.vyro_notice_visible(id));

create or replace function public.vyro_notify(p_recipient uuid,p_actor uuid,p_kind text) returns void
language sql security definer set search_path='' as $$
  insert into public.social_notifications as n(recipient_id,actor_id,kind,in_app)
    select p_recipient,p_actor,p_kind,public.vyro_notice_preference(p_recipient,p_kind,false)
    where p_recipient<>p_actor and (public.vyro_notice_preference(p_recipient,p_kind,false)
      or public.vyro_notice_preference(p_recipient,p_kind,true))
  on conflict(recipient_id,actor_id,kind) where kind in ('follow','request','accepted')
    do update set created_at=now(),read_at=null,in_app=excluded.in_app
    where n.created_at<now()-interval '24 hours'
$$;

create function public.vyro_reaction_notice() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; actor uuid; notice_kind text; comment uuid;
begin
  select author_id into recipient from public.posts where id=new.post_id;
  if TG_TABLE_NAME='likes' then actor:=new.user_id;notice_kind:='like';
  else actor:=new.author_id;notice_kind:='comment';comment:=new.id; end if;
  if recipient=actor or recipient is null then return new; end if;
  insert into public.social_notifications as n(recipient_id,actor_id,kind,post_id,comment_id,in_app)
    select recipient,actor,notice_kind,new.post_id,comment,public.vyro_notice_preference(recipient,notice_kind,false)
    where public.vyro_notice_preference(recipient,notice_kind,false) or public.vyro_notice_preference(recipient,notice_kind,true)
  on conflict(recipient_id,actor_id,kind,post_id) where post_id is not null
    do update set created_at=now(),read_at=null,comment_id=excluded.comment_id,in_app=excluded.in_app
    where n.created_at<now()-case when notice_kind='like' then interval '24 hours' else interval '5 minutes' end;
  return new;
end $$;
revoke all on function public.vyro_reaction_notice() from public,anon,authenticated;
create trigger likes_notify after insert on public.likes for each row execute function public.vyro_reaction_notice();
create trigger comments_notify after insert on public.comments for each row execute function public.vyro_reaction_notice();

-- Only explicit, first-time publication alerts current accepted followers.
-- Republishing an existing snapshot or merely saving a private workout does not.
create function public.vyro_post_notice() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.social_notifications(recipient_id,actor_id,kind,post_id,place_post_id,in_app)
    select f.follower_id,new.author_id,'post',
      case when TG_TABLE_NAME='posts' then new.id end,
      case when TG_TABLE_NAME='place_posts' then new.id end,
      public.vyro_notice_preference(f.follower_id,'post',false)
    from public.follows f where f.following_id=new.author_id and f.follower_id<>new.author_id
      and (public.vyro_notice_preference(f.follower_id,'post',false) or public.vyro_notice_preference(f.follower_id,'post',true))
    on conflict do nothing;
  return new;
end $$;
revoke all on function public.vyro_post_notice() from public,anon,authenticated;
create trigger posts_notify after insert on public.posts for each row execute function public.vyro_post_notice();
create trigger place_posts_notify after insert on public.place_posts for each row execute function public.vyro_post_notice();

create or replace function public.vyro_queue_push() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='UPDATE' and new.created_at=old.created_at then return new; end if;
  if not public.vyro_notice_preference(new.recipient_id,new.kind,true) then return new; end if;
  insert into public.push_jobs(notification_id,installation,recipient_id,event_at)
    select new.id,d.installation,new.recipient_id,new.created_at from public.push_devices d
    where d.owner_id=new.recipient_id and d.enabled and d.updated_at>now()-interval '30 days'
      and exists(select 1 from auth.sessions s where s.id=d.session_id and s.user_id=d.owner_id)
    on conflict do nothing;
  return new;
end $$;

drop function public.vyro_claim_push();
create function public.vyro_claim_push() returns table(id uuid,lease uuid,token text,recipient_id uuid,kind text,ticket text,attempts integer,notice_id uuid)
language plpgsql security definer set search_path='' as $$
begin
  delete from public.push_jobs where event_at<now()-interval '30 days';
  update public.push_jobs set status='failed',error_code='expired' where status in('pending','receipt') and event_at<now()-interval '24 hours';
  update public.push_jobs j set status='failed',error_code='inactive' where j.status in('pending','receipt') and not exists(
    select 1 from public.push_devices d join public.social_notifications n on n.id=j.notification_id
    where d.installation=j.installation and d.owner_id=j.recipient_id and d.enabled and d.updated_at>now()-interval '30 days'
      and exists(select 1 from auth.sessions s where s.id=d.session_id and s.user_id=d.owner_id)
      and (j.status='receipt' or (n.read_at is null and n.created_at=j.event_at
        and public.vyro_notice_preference(n.recipient_id,n.kind,true) and public.vyro_notice_source_available(n.id))));
  return query with chosen as (
    select j.id from public.push_jobs j where j.status in('pending','receipt') and j.available_at<=now()
      and (j.lease_until is null or j.lease_until<now()) order by j.available_at limit 50 for update skip locked
  ), leased as (
    update public.push_jobs j set lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=j.attempts+1
    from chosen c where j.id=c.id returning j.*
  ) select j.id,j.lease,d.token,j.recipient_id,n.kind,j.ticket,j.attempts,n.id
    from leased j join public.push_devices d on d.installation=j.installation join public.social_notifications n on n.id=j.notification_id;
end $$;
revoke all on function public.vyro_claim_push() from public,anon,authenticated;
grant execute on function public.vyro_claim_push() to service_role;

-- Push-only notifications cannot be selected through the inbox. This RPC returns
-- only the authenticated recipient's currently accessible target, never its body.
create function public.vyro_notification_target(p_notice uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n public.social_notifications;
begin
  select * into n from public.social_notifications where id=p_notice and recipient_id=auth.uid() for update;
  if not found or not public.vyro_notice_source_available(n.id) then return null; end if;
  update public.social_notifications set read_at=now() where id=n.id;
  return jsonb_build_object('postId',coalesce(n.post_id,n.place_post_id),
    'type',case when n.place_post_id is not null then 'place' else 'workout' end,
    'comments',n.kind='comment','username',(select username from public.profiles where id=n.actor_id));
end $$;
revoke all on function public.vyro_notification_target(uuid) from public,anon;
grant execute on function public.vyro_notification_target(uuid) to authenticated;
commit;
