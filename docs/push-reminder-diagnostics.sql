-- Read-only Push/Reminder QA checks for Lovable SQL Editor.
-- Replace the email below, then run the whole file or single sections.
-- This file does not update, delete, or reset anything.

with target_user as (
  select id, email, created_at, last_sign_in_at
  from auth.users
  where lower(email) = lower('REPLACE_WITH_PLAYER_EMAIL')
)
select
  u.id as user_id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  p.full_name,
  array_agg(distinct ur.role) filter (where ur.role is not null) as roles
from target_user u
left join public.profiles p on p.id = u.id
left join public.user_roles ur on ur.user_id = u.id
group by u.id, u.email, u.created_at, u.last_sign_in_at, p.full_name;

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('REPLACE_WITH_PLAYER_EMAIL')
)
select
  ps.user_id,
  ps.created_at,
  ps.updated_at,
  ps.timezone,
  ps.morning_hour,
  ps.morning_minute,
  ps.evening_hour,
  ps.evening_minute,
  ps.pre_training_minutes,
  left(ps.endpoint, 48) || '...' as endpoint_preview
from public.push_subscriptions ps
join target_user u on u.id = ps.user_id
order by ps.updated_at desc nulls last, ps.created_at desc;

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('REPLACE_WITH_PLAYER_EMAIL')
)
select
  nl.notification_type,
  nl.sent_date,
  nl.status,
  nl.scheduled_for,
  nl.sent_at,
  nl.opened_at,
  nl.failed_at,
  nl.error_code,
  nl.target_url,
  nl.metadata
from public.notification_log nl
join target_user u on u.id = nl.user_id
order by nl.created_at desc
limit 30;

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('REPLACE_WITH_PLAYER_EMAIL')
)
select
  pi.id as program_instance_id,
  pi.team_id,
  pi.status,
  pi.started_at,
  pi.created_at
from public.program_instances pi
join target_user u on u.id = pi.user_id
order by pi.created_at desc;

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('REPLACE_WITH_PLAYER_EMAIL')
),
teams_for_user as (
  select tm.team_id
  from public.team_members tm
  join target_user u on u.id = tm.user_id
)
select
  t.name as team_name,
  t.program_start_date,
  tce.date,
  tce.event_type,
  tce.title,
  tce.training_local_hour,
  tce.training_local_minute,
  tce.training_timezone
from teams_for_user tfu
join public.teams t on t.id = tfu.team_id
left join public.team_calendar_events tce on tce.team_id = tfu.team_id
where tce.date >= current_date - interval '7 days'
  and tce.date <= current_date + interval '14 days'
order by tce.date asc nulls last;
