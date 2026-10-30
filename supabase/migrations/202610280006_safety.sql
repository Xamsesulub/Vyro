begin;
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create index blocked_reverse on public.user_blocks(blocked_id,blocker_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public,anon,authenticated;
grant select on public.user_blocks to authenticated;
create policy own_blocks on public.user_blocks for select to authenticated using(blocker_id=(select auth.uid()));
create function public.vyro_pair_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;
revoke all on function public.vyro_pair_blocked(uuid,uuid) from public,anon,authenticated;
create function public.vyro_visible_person(p_target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not public.vyro_pair_blocked(auth.uid(),p_target)
$$;
revoke all on function public.vyro_visible_person(uuid) from public,anon;
grant execute on function public.vyro_visible_person(uuid) to authenticated;
create function public.vyro_block(p_target uuid,p_block boolean default true) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or actor=p_target or p_target is null then raise exception 'Invalid actor' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(actor,p_target)::text||greatest(actor,p_target)::text,0));
 if not p_block then delete from public.user_blocks where blocker_id=actor and blocked_id=p_target; return; end if;
 insert into public.user_blocks(blocker_id,blocked_id) values(actor,p_target) on conflict do nothing;
 delete from public.follows where (follower_id=actor and following_id=p_target) or (follower_id=p_target and following_id=actor);
 delete from public.follow_requests where (requester_id=actor and recipient_id=p_target) or (requester_id=p_target and recipient_id=actor);
 delete from public.club_invitations where (invitee_id=actor and invited_by=p_target) or (invitee_id=p_target and invited_by=actor);
 delete from public.social_notifications where (recipient_id=actor and actor_id=p_target) or (recipient_id=p_target and actor_id=actor);
end $$;
revoke all on function public.vyro_block(uuid,boolean) from public,anon;
grant execute on function public.vyro_block(uuid,boolean) to authenticated;
create trigger block_limit before insert on public.user_blocks for each row execute function public.limit_vyro_write();
create function public.vyro_guard_relationship() returns trigger
language plpgsql security definer set search_path='' as $$
declare a uuid; b uuid;
begin
 if tg_table_name='follows' then a:=new.follower_id;b:=new.following_id;
 elsif tg_table_name='club_invitations' then a:=new.invited_by;b:=new.invitee_id;
 else a:=new.requester_id;b:=new.recipient_id; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(a,b)::text||greatest(a,b)::text,0));
 if public.vyro_pair_blocked(a,b) then raise exception 'Relationship unavailable' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function public.vyro_guard_relationship() from public,anon,authenticated;
create trigger guard_follow before insert or update on public.follows for each row execute function public.vyro_guard_relationship();
create trigger guard_request before insert or update on public.follow_requests for each row execute function public.vyro_guard_relationship();
create trigger guard_invite before insert or update on public.club_invitations for each row execute function public.vyro_guard_relationship();
create policy profiles_block on public.profiles as restrictive for select to authenticated using(public.vyro_visible_person(id));
create policy follows_block on public.follows as restrictive for select to authenticated using(public.vyro_visible_person(follower_id) and public.vyro_visible_person(following_id));
create policy comments_block on public.comments as restrictive for select to authenticated using(public.vyro_visible_person(author_id));
create policy likes_block on public.likes as restrictive for select to authenticated using(public.vyro_visible_person(user_id));
create policy reposts_block on public.reposts as restrictive for select to authenticated using(public.vyro_visible_person(user_id));
create policy notices_block on public.social_notifications as restrictive for select to authenticated using(public.vyro_visible_person(actor_id));
create policy routes_block on public.route_suggestions as restrictive for select to authenticated using(public.vyro_visible_person(contributor_id));
create policy members_block on public.club_members as restrictive for select to authenticated using(public.vyro_visible_person(user_id));
create policy invitations_block on public.club_invitations as restrictive for select to authenticated using(public.vyro_visible_person(invited_by) and public.vyro_visible_person(invitee_id));
create or replace function public.vyro_can_read_social(p_author uuid,p_audience text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not public.vyro_pair_blocked(auth.uid(),p_author) and (p_author=auth.uid() or
 exists(select 1 from public.follows where follower_id=auth.uid() and following_id=p_author) or
 (p_audience='everyone' and exists(select 1 from public.profiles where id=p_author and not is_private)))
$$;
-- Applies also to pending notifications claimed later by the server worker.
alter function public.vyro_notice_source_available(uuid) rename to vyro_notice_source_before_blocks;
create function public.vyro_notice_source_available(p_notice uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.vyro_notice_source_before_blocks(p_notice) and exists(select 1 from public.social_notifications n
 where n.id=p_notice and not public.vyro_pair_blocked(n.actor_id,n.recipient_id))
$$;
revoke all on function public.vyro_notice_source_available(uuid) from public,anon,authenticated;
create function public.vyro_my_blocks() returns table(id uuid,display_name text)
language sql stable security definer set search_path='' as $$
 select p.id,p.display_name from public.user_blocks b join public.profiles p on p.id=b.blocked_id
 where b.blocker_id=auth.uid() order by b.created_at desc limit 1000
$$;
revoke all on function public.vyro_my_blocks() from public,anon;
grant execute on function public.vyro_my_blocks() to authenticated;

create table public.safety_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 target_id uuid not null references public.profiles(id) on delete cascade,
 post_id uuid references public.posts(id) on delete set null,
 place_post_id uuid references public.place_posts(id) on delete set null,
 reason text not null check(reason in ('spam','harassment','privacy','inappropriate','other')),
 details text not null default '' check(length(details)<=1000),
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 check(reporter_id<>target_id), check(num_nonnulls(post_id,place_post_id)<=1)
);
create index reports_queue on public.safety_reports(status,created_at);
alter table public.safety_reports enable row level security;
revoke all on public.safety_reports from public,anon,authenticated;
-- Reports are visible only to administrators; the reporter gets a receipt ID.
create function public.vyro_report(p_target uuid,p_reason text,p_details text default '',p_post uuid default null,p_place uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt uuid;
begin
 if actor is null or actor=p_target or not exists(select 1 from public.profiles where id=p_target)
   or public.vyro_pair_blocked(actor,p_target) then raise exception 'Unavailable' using errcode='42501'; end if;
 if p_post is not null and not exists(select 1 from public.posts where id=p_post and author_id=p_target and public.vyro_can_read_social(author_id,audience))
   then raise exception 'Unavailable' using errcode='42501'; end if;
 if p_place is not null and not exists(select 1 from public.place_posts where id=p_place and author_id=p_target and public.vyro_can_read_social(author_id,audience))
   then raise exception 'Unavailable' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('report:'||actor::text,0));
 select id into receipt from public.safety_reports where reporter_id=actor and target_id=p_target
   and post_id is not distinct from p_post and place_post_id is not distinct from p_place and status='open' limit 1;
 if receipt is not null then return receipt; end if;
 if (select count(*) from public.safety_reports where reporter_id=actor and created_at>now()-interval '1 day')>=10
   then raise exception 'Too many reports' using errcode='P0001'; end if;
 insert into public.safety_reports(reporter_id,target_id,post_id,place_post_id,reason,details)
 values(actor,p_target,p_post,p_place,p_reason,p_details) returning id into receipt;
 return receipt;
end $$;
revoke all on function public.vyro_report(uuid,text,text,uuid,uuid) from public,anon;
grant execute on function public.vyro_report(uuid,text,text,uuid,uuid) to authenticated;

-- These two RPCs intentionally bypass RLS to search/save public route contributions.
-- Apply the same block rule explicitly, including edits of existing bookmarks.
create or replace function public.search_community_routes(p_latitude double precision,p_longitude double precision,p_sport text,p_length integer default 0) returns setof public.route_suggestions
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if p_latitude is null or p_latitude not between -85 and 85 or p_longitude is null or p_longitude not between -180 and 180
   or p_sport is null or p_sport not in ('Løping','Gange','Fottur') or p_length is null or p_length not in (0,3000,5000,10000,15000) then raise exception 'INVALID_QUERY'; end if;
 return query select r.* from public.route_suggestions r where r.source='community'
   and not public.vyro_pair_blocked(auth.uid(),r.contributor_id)
   and r.sport=p_sport and (p_length=0 or r.distance_m between p_length*0.6 and p_length*1.5)
   and r.latitude between p_latitude-0.14 and p_latitude+0.14
   and public.vyro_route_meters(jsonb_build_object('latitude',p_latitude,'longitude',p_longitude),jsonb_build_object('latitude',r.latitude,'longitude',r.longitude))<=15000
   order by public.vyro_route_meters(jsonb_build_object('latitude',p_latitude,'longitude',p_longitude),jsonb_build_object('latitude',r.latitude,'longitude',r.longitude)),r.created_at desc,r.id limit 20;
end $$;
create or replace function public.save_route_suggestion(p_route_id text,p_name text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('save-route:'||actor::text,0));
 if not exists(select 1 from public.route_suggestions where id=p_route_id
   and not public.vyro_pair_blocked(actor,contributor_id)
   and (source='community' or exists(select 1 from public.saved_route_suggestions where owner_id=actor and route_id=p_route_id)))
   then raise exception 'ROUTE_NOT_FOUND'; end if;
 if exists(select 1 from public.saved_route_suggestions where owner_id=actor and route_id=p_route_id) then
   update public.saved_route_suggestions set name=coalesce(nullif(btrim(p_name),''),name) where owner_id=actor and route_id=p_route_id;
   return;
 end if;
 if (select count(*) from public.saved_route_suggestions where owner_id=actor)>=500 then raise exception 'ROUTE_LIBRARY_FULL'; end if;
 insert into public.saved_route_suggestions(owner_id,route_id,name)
 values(actor,p_route_id,coalesce(nullif(btrim(p_name),''),(select name from public.route_suggestions where id=p_route_id)));
end $$;
commit;
