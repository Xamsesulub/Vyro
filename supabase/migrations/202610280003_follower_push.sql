begin;
create table public.push_devices (
  installation uuid primary key, owner_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null, token text not null unique, enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  check(length(token) between 20 and 250 and token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$')
);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from public,anon,authenticated;
grant all on public.push_devices to service_role;
create index push_devices_owner on public.push_devices(owner_id) where enabled;

create function public.vyro_register_push(p_installation uuid,p_token text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); session uuid:=nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id';
begin
  if actor is null or session is null or not exists(select 1 from auth.sessions where id=session and user_id=actor)
    then raise exception 'Active session required' using errcode='42501'; end if;
  -- A token belongs to one current installation/account. Signing in again rebinds it.
  delete from public.push_devices where token=p_token and installation<>p_installation;
  insert into public.push_devices(installation,owner_id,session_id,token) values(p_installation,actor,session,p_token)
    on conflict(installation) do update set owner_id=actor,session_id=session,token=p_token,enabled=true,updated_at=now();
end $$;
revoke all on function public.vyro_register_push(uuid,text) from public,anon;
grant execute on function public.vyro_register_push(uuid,text) to authenticated;
create function public.vyro_disable_push(p_installation uuid) returns void
language sql security definer set search_path='' as $$
  update public.push_devices set enabled=false,updated_at=now() where installation=p_installation and owner_id=auth.uid()
$$;
revoke all on function public.vyro_disable_push(uuid) from public,anon;
grant execute on function public.vyro_disable_push(uuid) to authenticated;
create function public.vyro_push_enabled(p_installation uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.push_devices where installation=p_installation and owner_id=auth.uid() and enabled)
$$;
revoke all on function public.vyro_push_enabled(uuid) from public,anon;
grant execute on function public.vyro_push_enabled(uuid) to authenticated;

create table public.push_jobs (
  id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.social_notifications(id) on delete cascade,
  installation uuid not null references public.push_devices(installation) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_at timestamptz not null, status text not null default 'pending' check(status in('pending','receipt','done','failed')),
  ticket text, attempts integer not null default 0, available_at timestamptz not null default now(),
  lease uuid, lease_until timestamptz, error_code text,
  unique(notification_id,installation,event_at)
);
alter table public.push_jobs enable row level security;
revoke all on public.push_jobs from public,anon,authenticated;
grant all on public.push_jobs to service_role;
create index push_jobs_pending on public.push_jobs(available_at) where status in('pending','receipt');
create function public.vyro_queue_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='UPDATE' and new.created_at=old.created_at then return new; end if;
  insert into public.push_jobs(notification_id,installation,recipient_id,event_at)
    select new.id,d.installation,new.recipient_id,new.created_at from public.push_devices d
    where d.owner_id=new.recipient_id and d.enabled and d.updated_at>now()-interval '30 days'
    and exists(select 1 from auth.sessions s where s.id=d.session_id and s.user_id=d.owner_id)
    on conflict do nothing;
  return new;
end $$;
revoke all on function public.vyro_queue_push() from public,anon,authenticated;
create trigger social_notification_push after insert or update of created_at on public.social_notifications
  for each row execute function public.vyro_queue_push();

-- Only the server can lease jobs or access push addresses. Leases permit safe retries.
create function public.vyro_claim_push() returns table(id uuid,lease uuid,token text,recipient_id uuid,kind text,ticket text,attempts integer)
language plpgsql security definer set search_path='' as $$
begin
  delete from public.push_jobs j where j.event_at<now()-interval '30 days';
  update public.push_jobs j set status='failed',error_code='expired' where j.status in('pending','receipt') and j.event_at<now()-interval '24 hours';
  update public.push_jobs j set status='done' where j.status in('pending','receipt') and not exists(
    select 1 from public.push_devices d join public.social_notifications n on n.id=j.notification_id
    where d.installation=j.installation and d.owner_id=j.recipient_id and d.enabled and d.updated_at>now()-interval '30 days'
    and (j.status='receipt' or n.read_at is null) and exists(select 1 from auth.sessions s where s.id=d.session_id and s.user_id=d.owner_id));
  return query with chosen as (
    select j.id from public.push_jobs j where j.status in('pending','receipt') and j.available_at<=now()
      and (j.lease_until is null or j.lease_until<now()) order by j.available_at limit 50 for update skip locked
  ), leased as (
    update public.push_jobs j set lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=j.attempts+1
    from chosen c where j.id=c.id returning j.*
  ) select j.id,j.lease,d.token,j.recipient_id,n.kind,j.ticket,j.attempts
    from leased j join public.push_devices d on d.installation=j.installation join public.social_notifications n on n.id=j.notification_id;
end $$;
revoke all on function public.vyro_claim_push() from public,anon,authenticated;
grant execute on function public.vyro_claim_push() to service_role;
create function public.vyro_finish_push(p_id uuid,p_lease uuid,p_result text,p_ticket text default null,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare job public.push_jobs;
begin
  select * into job from public.push_jobs where id=p_id and lease=p_lease for update;
  if not found then return; end if;
  if p_result='unregistered' then
    -- Never disable a device rebound to another account while this job was in flight.
    update public.push_devices set enabled=false where installation=job.installation and owner_id=job.recipient_id;
  end if;
  update public.push_jobs set
    status=case when p_result='ticket' and p_ticket is not null then 'receipt'
      when p_result='delivered' then 'done'
      when p_result='retry' and job.attempts<5 then job.status else 'failed' end,
    ticket=coalesce(p_ticket,job.ticket), attempts=case when p_result='ticket' then 0 else job.attempts end,
    available_at=now()+case when p_result='ticket' then interval '15 minutes' else interval '2 minutes'*greatest(1,job.attempts) end,
    lease=null,lease_until=null,error_code=left(p_error,80)
    where id=job.id;
end $$;
revoke all on function public.vyro_finish_push(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.vyro_finish_push(uuid,uuid,text,text,text) to service_role;
commit;
