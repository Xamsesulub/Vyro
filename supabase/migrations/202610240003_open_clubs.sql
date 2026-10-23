begin;

-- Existing clubs remain private; openness never changes workout/photo audiences.
alter table public.clubs add column visibility text not null default 'private'
  check (visibility in ('private','open'));
create index clubs_open_discovery_idx on public.clubs(created_at desc,id desc) where visibility='open';
create trigger limit_club_members before insert on public.club_members for each row execute function public.limit_vyro_write();

drop policy clubs_read on public.clubs;
create policy clubs_read on public.clubs for select to authenticated using (
  visibility='open' or public.vyro_club_member(id) or exists(
    select 1 from public.club_invitations i where i.club_id=clubs.id and i.invitee_id=(select auth.uid()))
);
-- Member identities and invitations still require the existing private policies.
drop function public.create_club(text,text);
create function public.create_club(p_name text,p_description text default '',p_visibility text default 'private') returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  insert into public.clubs(owner_id,name,description,visibility)
    values(actor,btrim(p_name),btrim(p_description),p_visibility) returning id into result;
  insert into public.club_members(club_id,user_id) values(result,actor);
  return result;
end $$;

create function public.join_open_club(p_club uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Serialize with visibility changes/deletion; the client cannot select another member.
  perform 1 from public.clubs where id=p_club and visibility='open' for update;
  if not found then raise exception 'Club is not open' using errcode='42501'; end if;
  insert into public.club_members(club_id,user_id) values(p_club,actor) on conflict do nothing;
  delete from public.club_invitations where club_id=p_club and invitee_id=actor;
  return p_club;
end $$;

create function public.set_club_visibility(p_club uuid,p_visibility text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.clubs set visibility=p_visibility where id=p_club and owner_id=auth.uid();
  if not found then raise exception 'Only the owner may manage the club' using errcode='42501'; end if;
end $$;

-- Bounded discovery/counts expose no member identities, private clubs or invitations.
create function public.vyro_clubs(p_kind text default 'mine',p_limit integer default 21,
  p_before_created_at timestamptz default null,p_before_id uuid default null)
returns table(id uuid,name text,description text,owner_id uuid,visibility text,
  created_at timestamptz,member_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_kind is null or p_kind not in ('mine','discover') or
    (p_before_created_at is null)<>(p_before_id is null) then raise exception 'Invalid cursor' using errcode='22023'; end if;
  return query select c.id,c.name,c.description,c.owner_id,c.visibility,c.created_at,
    (select count(*) from public.club_members m where m.club_id=c.id)
    from public.clubs c where (
      (p_kind='mine' and exists(select 1 from public.club_members m where m.club_id=c.id and m.user_id=actor)) or
      (p_kind='discover' and c.visibility='open' and not exists(select 1 from public.club_members m where m.club_id=c.id and m.user_id=actor))
    ) and (p_before_created_at is null or (c.created_at,c.id)<(p_before_created_at,p_before_id))
    order by c.created_at desc,c.id desc limit greatest(1,least(coalesce(p_limit,21),51));
end $$;
revoke all on function public.create_club(text,text,text),public.join_open_club(uuid),public.set_club_visibility(uuid,text),public.vyro_clubs(text,integer,timestamptz,uuid) from public,anon;
grant execute on function public.create_club(text,text,text),public.join_open_club(uuid),public.set_club_visibility(uuid,text),public.vyro_clubs(text,integer,timestamptz,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
