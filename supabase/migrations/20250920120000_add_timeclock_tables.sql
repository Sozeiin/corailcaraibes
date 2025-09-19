-- Add timeclock related tables and policies

-- Sites / Bases
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  geofence_radius_m integer default 20,
  created_at timestamptz default now()
);

-- Time rules per site
create table if not exists time_rules (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  daily_regular_minutes integer default 480,
  auto_lunch_minutes integer default 0,
  lunch_window_start time default '12:00',
  lunch_window_end time default '14:00',
  round_minutes integer default 0,
  overtime_after_hour time,
  created_at timestamptz default now()
);

-- Raw time punches from devices
create table if not exists time_punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  site_id uuid not null references sites(id),
  kind text check (kind in ('IN','OUT','BREAK_START','BREAK_END')),
  client_ts timestamptz,
  server_ts timestamptz default now(),
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  distance_m double precision,
  is_within_geofence boolean,
  device_id text,
  notes text
);

-- Computed sessions for reporting
create table if not exists time_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  site_id uuid not null references sites(id),
  start_ts timestamptz not null,
  end_ts timestamptz,
  duration_work_min integer default 0,
  duration_regular_min integer default 0,
  duration_overtime_min integer default 0,
  duration_break_min integer default 0,
  has_anomaly boolean default false,
  anomaly_reason text,
  created_at timestamptz default now()
);

-- Enable row level security
alter table time_rules enable row level security;
alter table time_punches enable row level security;
alter table time_sessions enable row level security;

-- Policies
create policy tr_all_read on time_rules
  for select using (true);

create policy tr_dir_write on time_rules
  for all using (
    exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'direction')
  ) with check (
    exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'direction')
  );

create policy tp_own on time_punches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy tp_base_read on time_punches
  for select using (
    exists (
      select 1 from managers m
      where m.user_id = auth.uid() and m.site_id = site_id
    )
  );

create policy ts_own on time_sessions
  for select using (auth.uid() = user_id);

create policy ts_base_read on time_sessions
  for select using (
    exists (
      select 1 from managers m
      where m.user_id = auth.uid() and m.site_id = site_id
    )
  );

-- Trigger function to compute distance and geofence
create or replace function trg_time_punches_geofence()
returns trigger as $$
declare
  s record;
  dist double precision;
begin
  select * into s from sites where id = new.site_id;
  if s is not null and new.lat is not null and new.lng is not null then
    dist := 2 * 6371000 * asin(sqrt(power(sin(radians((new.lat - s.lat)/2)),2) + cos(radians(s.lat))*cos(radians(new.lat))*power(sin(radians((new.lng - s.lng)/2)),2)));
    new.distance_m := dist;
    new.is_within_geofence := dist <= coalesce(s.geofence_radius_m,20);
  end if;
  new.server_ts := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger before_insert_time_punches
before insert on time_punches
for each row execute function trg_time_punches_geofence();

-- Placeholder for finalize_session, to be implemented later
create or replace function finalize_session()
returns trigger as $$
begin
  -- TODO: compute durations and close sessions
  return new;
end;
$$ language plpgsql;

