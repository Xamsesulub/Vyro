begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,40}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  created_at timestamptz not null default now()
);
create function public.create_vyro_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username, display_name)
  values (new.id, 'runner_' || replace(new.id::text, '-', ''),
    coalesce(nullif(left(btrim(new.raw_user_meta_data->>'display_name'),50),''), 'Løper'));
  return new;
end $$;
revoke all on function public.create_vyro_profile() from public;
create trigger vyro_profile_after_signup after insert on auth.users
for each row execute function public.create_vyro_profile();
insert into public.profiles(id, username, display_name)
select id, 'runner_' || replace(id::text, '-', ''),
coalesce(nullif(left(btrim(raw_user_meta_data->>'display_name'),50),''), 'Løper')
from auth.users on conflict (id) do nothing;

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id),
  check(follower_id <> following_id)
);
create index follows_target_idx on public.follows(following_id);

create function public.valid_vyro_route(route jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare p jsonb;
begin
  if route is null or jsonb_typeof(route) <> 'array' then return false; end if;
  if jsonb_array_length(route) < 2 or jsonb_array_length(route) > 20000 then return false; end if;
  for p in select value from jsonb_array_elements(route) loop
    if jsonb_typeof(p->'latitude') is distinct from 'number'
      or jsonb_typeof(p->'longitude') is distinct from 'number' then return false; end if;
    if (p->>'latitude')::numeric not between -90 and 90
      or (p->>'longitude')::numeric not between -180 and 180 then return false; end if;
  end loop;
  return true;
end $$;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  local_id text not null check(char_length(local_id) between 1 and 100),
  title text not null check(char_length(btrim(title)) between 1 and 100),
  sport text not null check(sport in ('Løping','Gange','Sykling','Fottur')),
  distance_km numeric not null check(distance_km > 0 and distance_km < 10000),
  seconds integer not null check(seconds > 0 and seconds < 2592000),
  recorded_at timestamptz not null,
  source text not null check(source = 'gps'),
  route jsonb not null check(public.valid_vyro_route(route)),
  unique(owner_id,local_id),
  unique(id,owner_id)
);
-- Posts contain only the explicitly shared snapshot; private activity data stays private.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null unique,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  sport text not null,
  distance_km numeric not null,
  seconds integer not null,
  recorded_at timestamptz not null,
  route jsonb not null,
  created_at timestamptz not null default now(),
  foreign key(activity_id,author_id) references public.activities(id,owner_id) on delete cascade
);
create index posts_feed_idx on public.posts(created_at desc,id);
create index posts_author_idx on public.posts(author_id,created_at desc);
create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key(user_id,post_id)
);
create table public.reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index likes_post_idx on public.likes(post_id);
create index reposts_post_idx on public.reposts(post_id);
create index comments_post_idx on public.comments(post_id,created_at);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.activities enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.reposts enable row level security;
alter table public.comments enable row level security;
revoke all on public.profiles,public.follows,public.activities,public.posts,
  public.likes,public.reposts,public.comments from anon,authenticated;
grant select on public.profiles,public.follows,public.activities,public.posts,
  public.likes,public.reposts,public.comments to authenticated;
grant update(username,display_name) on public.profiles to authenticated;
grant insert,delete on public.follows,public.likes,public.reposts,public.comments to authenticated;
grant delete on public.activities,public.posts to authenticated;

create policy profiles_read on public.profiles for select to authenticated using(true);
create policy profiles_edit on public.profiles for update to authenticated
using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy follows_read on public.follows for select to authenticated using(true);
create policy follows_add on public.follows for insert to authenticated with check(follower_id=(select auth.uid()));
create policy follows_remove on public.follows for delete to authenticated using(follower_id=(select auth.uid()));
create policy activities_private on public.activities for select to authenticated using(owner_id=(select auth.uid()));
create policy activities_remove on public.activities for delete to authenticated using(owner_id=(select auth.uid()));
create policy posts_read on public.posts for select to authenticated using(true);
create policy posts_remove on public.posts for delete to authenticated using(author_id=(select auth.uid()));
create policy likes_read on public.likes for select to authenticated using(true);
create policy likes_add on public.likes for insert to authenticated with check(user_id=(select auth.uid()));
create policy likes_remove on public.likes for delete to authenticated using(user_id=(select auth.uid()));
create policy reposts_read on public.reposts for select to authenticated using(true);
create policy reposts_add on public.reposts for insert to authenticated with check(user_id=(select auth.uid()));
create policy reposts_remove on public.reposts for delete to authenticated using(user_id=(select auth.uid()));
create policy comments_read on public.comments for select to authenticated using(true);
create policy comments_add on public.comments for insert to authenticated with check(author_id=(select auth.uid()));
create policy comments_remove on public.comments for delete to authenticated using(author_id=(select auth.uid()));

-- Atomic, idempotent publication. No client may insert arbitrary posts or claim another owner.
create function public.publish_workout(
  p_local_id text, p_title text, p_sport text, p_distance_km numeric,
  p_seconds integer, p_recorded_at timestamptz, p_source text, p_route jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); activity public.activities; post_id uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_source is distinct from 'gps' then raise exception 'Only GPS workouts may be shared'; end if;
  insert into public.activities(owner_id,local_id,title,sport,distance_km,seconds,recorded_at,source,route)
  values(actor,p_local_id,btrim(p_title),p_sport,p_distance_km,p_seconds,p_recorded_at,p_source,p_route)
  on conflict(owner_id,local_id) do update set local_id=excluded.local_id
  returning * into activity;
  insert into public.posts(activity_id,author_id,title,sport,distance_km,seconds,recorded_at,route)
  values(activity.id,actor,activity.title,activity.sport,activity.distance_km,activity.seconds,activity.recorded_at,activity.route)
  on conflict(activity_id) do update set activity_id=excluded.activity_id
  returning id into post_id;
  return post_id;
end $$;
revoke all on function public.publish_workout(text,text,text,numeric,integer,timestamptz,text,jsonb) from public,anon;
grant execute on function public.publish_workout(text,text,text,numeric,integer,timestamptz,text,jsonb) to authenticated;
commit;
