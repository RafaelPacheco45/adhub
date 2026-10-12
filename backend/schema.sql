-- Isolated two-hour demo sessions. No venue, account, media or billing access.
begin;
create schema if not exists adhub_remote;
revoke all on schema adhub_remote from public,anon,authenticated;
grant usage on schema adhub_remote to service_role;
create table adhub_remote.sessions (
 id uuid primary key default gen_random_uuid(),
 display_hash text unique not null check(display_hash ~ '^[a-f0-9]{64}$'),
 control_hash text unique not null check(control_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '2 hours',
 video_id text check(video_id ~ '^[A-Za-z0-9_-]{11}$'),
 revision integer not null default 0,
 ack_revision integer not null default 0,
 playback text not null default 'waiting' check(playback in ('waiting','ready','playing','paused','blocked','error','ended')),
 last_seen_at timestamptz,
 last_command_at timestamptz
);
alter table adhub_remote.sessions enable row level security;
revoke all on adhub_remote.sessions from public,anon,authenticated;
create index sessions_created_idx on adhub_remote.sessions(created_at);
create function adhub_remote.dispatch(p_op text,p_hash text,p_other_hash text default null,p_video text default null,p_revision integer default null,p_state text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s adhub_remote.sessions;
begin
 if coalesce(p_hash,'') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid capability' using errcode='42501'; end if;
 if p_op='create' then
  if coalesce(p_other_hash,'') !~ '^[a-f0-9]{64}$' or p_hash=p_other_hash then raise exception 'Invalid capability' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(842310777);
  delete from adhub_remote.sessions where expires_at<now();
  if (select count(*) from adhub_remote.sessions where created_at>now()-interval '1 minute')>=20 or (select count(*) from adhub_remote.sessions)>=200 then raise exception 'Try later' using errcode='P0001'; end if;
  insert into adhub_remote.sessions(display_hash,control_hash) values(p_hash,p_other_hash) returning * into s;
 else
  if p_op in ('poll','ack','close') then
   select * into s from adhub_remote.sessions where display_hash=p_hash and expires_at>now() for update;
  elsif p_op in ('send','status') then
   select * into s from adhub_remote.sessions where control_hash=p_hash and expires_at>now() for update;
  else raise exception 'Invalid operation' using errcode='22023'; end if;
  if s.id is null then raise exception 'Expired or invalid capability' using errcode='42501'; end if;
  if p_op='send' then
   if coalesce(p_video,'') !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'Invalid video' using errcode='22023'; end if;
   if s.last_command_at>clock_timestamp()-interval '1 second' then raise exception 'Try later' using errcode='P0001'; end if;
   update adhub_remote.sessions set video_id=p_video,revision=revision+1,playback='waiting',last_command_at=clock_timestamp() where id=s.id returning * into s;
  elsif p_op='poll' then
   update adhub_remote.sessions set last_seen_at=now() where id=s.id;
  elsif p_op='ack' then
   if p_state not in ('ready','playing','paused','blocked','error','ended') or p_state is null or p_revision is null or p_revision<>s.revision then raise exception 'Invalid acknowledgement' using errcode='22023'; end if;
   update adhub_remote.sessions set ack_revision=p_revision,playback=p_state,last_seen_at=now() where id=s.id returning * into s;
  elsif p_op='close' then
   delete from adhub_remote.sessions where id=s.id;
   return jsonb_build_object('closed',true);
  end if;
 end if;
 return jsonb_build_object('screen',upper(left(s.id::text,6)),'expires_at',s.expires_at,'video_id',s.video_id,'revision',s.revision,'ack_revision',s.ack_revision,'playback',s.playback,'last_seen_at',s.last_seen_at);
end $$;
revoke all on function adhub_remote.dispatch(text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function adhub_remote.dispatch(text,text,text,text,integer,text) to service_role;
create function public.adhub_remote_dispatch(p_op text,p_hash text,p_other_hash text default null,p_video text default null,p_revision integer default null,p_state text default null) returns jsonb
language sql security invoker set search_path='' as $$ select adhub_remote.dispatch(p_op,p_hash,p_other_hash,p_video,p_revision,p_state); $$;
revoke all on function public.adhub_remote_dispatch(text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.adhub_remote_dispatch(text,text,text,text,integer,text) to service_role;
commit;
