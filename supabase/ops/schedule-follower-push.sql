-- Run after deploying follower-notifications and storing VYRO_PUSH_WORKER_SECRET
-- in Edge secrets AND Vault under the name vyro_push_worker. Never paste it here.
create extension if not exists pg_net with schema extensions;
select cron.schedule('vyro-follower-push','* * * * *',$job$
  select net.http_post(
    url:='https://diviitenhbidwrcpmkxr.supabase.co/functions/v1/follower-notifications',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='vyro_push_worker')),
    body:='{}'::jsonb,timeout_milliseconds:=60000
  ) where exists(select 1 from public.push_jobs where status in('pending','receipt') and available_at<=now());
$job$);
-- pg_net's queue contains request headers until sent. Restrict it to the server.
revoke all on all tables in schema net from public,anon,authenticated;
revoke all on all sequences in schema net from public,anon,authenticated;
