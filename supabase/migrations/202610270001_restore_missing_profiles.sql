begin;

-- Repair accounts whose public profile row is missing. The existing signup
-- trigger already handles new accounts; never overwrite an existing profile.
insert into public.profiles (id, username, display_name)
select u.id,
       'runner_' || replace(u.id::text, '-', ''),
       coalesce(nullif(left(btrim(u.raw_user_meta_data->>'display_name'), 50), ''), 'Løper')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

commit;
