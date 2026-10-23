begin;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 60),
  description text not null default '' check (length(description) <= 500),
  created_at timestamptz not null default now()
);
create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(club_id,user_id)
);
create table public.club_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(club_id,invitee_id)
);
create index club_members_user_idx on public.club_members(user_id,club_id);
create index club_invitations_invitee_idx on public.club_invitations(invitee_id,created_at desc);
create index clubs_owner_idx on public.clubs(owner_id);

create function public.vyro_club_member(p_club uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.club_members where club_id=p_club and user_id=(select auth.uid()))
$$;
create function public.vyro_club_owner(p_club uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.clubs where id=p_club and owner_id=(select auth.uid()))
$$;
revoke all on function public.vyro_club_member(uuid),public.vyro_club_owner(uuid) from public,anon;
grant execute on function public.vyro_club_member(uuid),public.vyro_club_owner(uuid) to authenticated;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_invitations enable row level security;
revoke all on public.clubs,public.club_members,public.club_invitations from public,anon,authenticated;
grant select on public.clubs,public.club_members,public.club_invitations to authenticated;
create policy clubs_read on public.clubs for select to authenticated using (
  public.vyro_club_member(id) or exists(select 1 from public.club_invitations i where i.club_id=clubs.id and i.invitee_id=(select auth.uid()))
);
create policy members_read on public.club_members for select to authenticated using (public.vyro_club_member(club_id));
create policy invitations_read on public.club_invitations for select to authenticated using (
  invitee_id=(select auth.uid()) or public.vyro_club_owner(club_id)
);
create trigger limit_clubs before insert on public.clubs for each row execute function public.limit_vyro_write();
create trigger limit_club_invitations before insert on public.club_invitations for each row execute function public.limit_vyro_write();

create function public.create_club(p_name text,p_description text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  insert into public.clubs(owner_id,name,description) values(actor,btrim(p_name),btrim(p_description)) returning id into result;
  insert into public.club_members(club_id,user_id) values(result,actor);
  return result;
end $$;
create function public.invite_to_club(p_club uuid,p_person uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  perform 1 from public.clubs where id=p_club and owner_id=actor for update;
  if not found then raise exception 'Only the owner may invite' using errcode='42501'; end if;
  if exists(select 1 from public.club_members where club_id=p_club and user_id=p_person) then return; end if;
  insert into public.club_invitations(club_id,invitee_id,invited_by) values(p_club,p_person,actor)
    on conflict(club_id,invitee_id) do nothing;
end $$;
create function public.respond_club_invitation(p_invitation uuid,p_accept boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation public.club_invitations;
begin
  if auth.uid() is null or p_accept is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into invitation from public.club_invitations where id=p_invitation and invitee_id=auth.uid() for update;
  if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  if p_accept then
    insert into public.club_members(club_id,user_id) values(invitation.club_id,auth.uid()) on conflict do nothing;
  end if;
  delete from public.club_invitations where id=invitation.id;
  return invitation.club_id;
end $$;
create function public.leave_club(p_club uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if public.vyro_club_owner(p_club) then raise exception 'Owner cannot leave their club' using errcode='22023'; end if;
  delete from public.club_members where club_id=p_club and user_id=auth.uid();
end $$;
create function public.manage_club(p_club uuid,p_person uuid default null,p_delete boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.clubs where id=p_club and owner_id=auth.uid() for update;
  if not found then raise exception 'Only the owner may manage the club' using errcode='42501'; end if;
  if p_delete then delete from public.clubs where id=p_club;
  elsif p_person is not null and p_person<>auth.uid() then
    delete from public.club_members where club_id=p_club and user_id=p_person;
    delete from public.club_invitations where club_id=p_club and invitee_id=p_person;
  else raise exception 'Invalid member' using errcode='22023'; end if;
end $$;
revoke all on function public.create_club(text,text),public.invite_to_club(uuid,uuid),public.respond_club_invitation(uuid,boolean),public.leave_club(uuid),public.manage_club(uuid,uuid,boolean) from public,anon;
grant execute on function public.create_club(text,text),public.invite_to_club(uuid,uuid),public.respond_club_invitation(uuid,boolean),public.leave_club(uuid),public.manage_club(uuid,uuid,boolean) to authenticated;

-- Place photos are independent posts, never activities, GPS evidence or turf.
create table public.place_posts (
  id uuid primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null check(length(btrim(caption)) between 1 and 1000),
  place_name text not null default '' check(length(place_name)<=100),
  photo_path text not null unique,
  audience text not null default 'followers' check(audience in ('followers','everyone')),
  created_at timestamptz not null default now(),
  constraint place_photo_path check(photo_path=author_id::text||'/'||id::text||'.jpg')
);
create index place_posts_feed_idx on public.place_posts(created_at desc,id desc);
create index place_posts_author_idx on public.place_posts(author_id,created_at desc,id desc);
alter table public.place_posts enable row level security;
revoke all on public.place_posts from public,anon,authenticated;
grant select,delete on public.place_posts to authenticated;
create policy place_posts_read on public.place_posts for select to authenticated using (
  author_id=(select auth.uid()) or audience='everyone' or exists(select 1 from public.follows where follower_id=(select auth.uid()) and following_id=author_id)
);
create policy place_posts_delete on public.place_posts for delete to authenticated using(author_id=(select auth.uid()));
create trigger limit_place_posts before insert on public.place_posts for each row execute function public.limit_vyro_write();

create function public.publish_place(p_id uuid,p_caption text,p_place_name text default '',p_audience text default 'followers') returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); photo text; uploaded boolean;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  photo := actor::text||'/'||p_id::text||'.jpg';
  -- A retry after a lost response returns the same publication, with no duplicates.
  if exists(select 1 from public.place_posts where id=p_id and author_id=actor) then return p_id; end if;
  execute 'select exists(select 1 from storage.objects where bucket_id=''place-photos'' and name=$1)' into uploaded using photo;
  if not uploaded then raise exception 'Upload the photo first' using errcode='22023'; end if;
  insert into public.place_posts(id,author_id,caption,place_name,photo_path,audience)
    values(p_id,actor,btrim(p_caption),btrim(p_place_name),photo,p_audience);
  return p_id;
end $$;
revoke all on function public.publish_place(uuid,text,text,text) from public,anon;
grant execute on function public.publish_place(uuid,text,text,text) to authenticated;

-- The old workout-only RPC is preserved for existing installations.
create function public.vyro_home_feed(p_kind text default 'following',p_limit integer default 20,
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
      jsonb_build_object('id',u.id,'username',u.username,'display_name',u.display_name))
      from public.place_posts p join public.profiles u on u.id=p.author_id
      where p_kind='following' and (p.author_id=(select auth.uid()) or exists(
        select 1 from public.follows where follower_id=(select auth.uid()) and following_id=p.author_id))
      and (p_before_created_at is null or (p.created_at,p.id)<(p_before_created_at,p_before_id))
  ) mixed order by mixed.created_at desc,mixed.id desc limit greatest(1,least(coalesce(p_limit,20),31));
end $$;
revoke all on function public.vyro_home_feed(text,integer,timestamptz,uuid) from public,anon;
grant execute on function public.vyro_home_feed(text,integer,timestamptz,uuid) to authenticated;
commit;
