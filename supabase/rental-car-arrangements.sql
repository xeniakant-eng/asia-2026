create table if not exists public.rental_cars (
  car_key text primary key,
  car_name text not null,
  capacity integer not null check (capacity > 0),
  notes text
);

create table if not exists public.rental_car_days (
  trip_date date primary key,
  segment_key text not null,
  status text not null default 'pending' check (status in ('planned', 'pending', 'not_required')),
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.rental_car_daily_assignments (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null references public.rental_car_days(trip_date) on delete cascade,
  car_key text not null references public.rental_cars(car_key),
  notes text,
  sort_order integer not null default 0,
  unique (trip_date, car_key)
);

create table if not exists public.rental_car_occupants (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.rental_car_daily_assignments(id) on delete cascade,
  person_name text not null,
  party_name text not null,
  role text not null check (role in ('driver', 'passenger')),
  sort_order integer not null default 0,
  unique (assignment_id, person_name)
);

alter table public.rental_cars enable row level security;
alter table public.rental_car_days enable row level security;
alter table public.rental_car_daily_assignments enable row level security;
alter table public.rental_car_occupants enable row level security;

create policy "Rental cars are readable" on public.rental_cars for select using (true);
create policy "Rental car days are readable" on public.rental_car_days for select using (true);
create policy "Rental car assignments are readable" on public.rental_car_daily_assignments for select using (true);
create policy "Rental car occupants are readable" on public.rental_car_occupants for select using (true);

insert into public.rental_cars (car_key, car_name, capacity)
values
  ('carA', 'Car A', 5),
  ('carB', 'Car B', 5),
  ('carC', 'Car C', 5),
  ('carD', 'Car D', 5)
on conflict (car_key) do update set
  car_name = excluded.car_name,
  capacity = excluded.capacity;

insert into public.rental_car_days (trip_date, segment_key, status)
values
  ('2026-11-25', 'nahaearly', 'planned'),
  ('2026-11-26', 'nahaearly', 'planned'),
  ('2026-11-27', 'onna', 'planned'),
  ('2026-11-28', 'onna', 'planned'),
  ('2026-11-29', 'onna', 'not_required')
on conflict (trip_date) do update set
  segment_key = excluded.segment_key,
  status = excluded.status,
  updated_at = now();

insert into public.rental_car_daily_assignments (trip_date, car_key, notes, sort_order)
values
  ('2026-11-25', 'carA', null, 1),
  ('2026-11-26', 'carA', null, 1),
  ('2026-11-27', 'carA', null, 1),
  ('2026-11-27', 'carB', null, 2),
  ('2026-11-27', 'carC', null, 3),
  ('2026-11-27', 'carD', null, 4),
  ('2026-11-28', 'carA', 'Blue Cave', 1),
  ('2026-11-28', 'carB', 'Blue Cave', 2),
  ('2026-11-28', 'carC', 'Ryukyu Mura', 3),
  ('2026-11-28', 'carD', 'Spare car', 4)
on conflict (trip_date, car_key) do update set
  notes = excluded.notes,
  sort_order = excluded.sort_order;

insert into public.rental_car_occupants (assignment_id, person_name, party_name, role, sort_order)
select assignment.id, occupant.person_name, occupant.party_name, occupant.role, occupant.sort_order
from (
  values
    ('2026-11-25'::date, 'carA', 'Mark', 'Mark Wang', 'driver', 1),
    ('2026-11-25'::date, 'carA', 'Steven', 'Steven Wang', 'passenger', 2),
    ('2026-11-26'::date, 'carA', 'Mark', 'Mark Wang', 'driver', 1),
    ('2026-11-26'::date, 'carA', 'Steven', 'Steven Wang', 'passenger', 2),

    ('2026-11-27'::date, 'carA', 'Mark', 'Mark Wang', 'driver', 1),
    ('2026-11-27'::date, 'carA', 'Steven', 'Steven Wang', 'passenger', 2),
    ('2026-11-27'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-11-27'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-11-27'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-11-27'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-11-27'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-11-27'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-11-27'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3)', 'driver', 1),
    ('2026-11-27'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 2),
    ('2026-11-27'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 3),
    ('2026-11-27'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 4),

    ('2026-11-28'::date, 'carA', 'Mark', 'Mark Wang', 'driver', 1),
    ('2026-11-28'::date, 'carA', 'Steven', 'Steven Wang', 'passenger', 2),
    ('2026-11-28'::date, 'carA', 'Christine', 'Anthony & Christine & Mona (1)', 'passenger', 3),
    ('2026-11-28'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-11-28'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-11-28'::date, 'carB', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 3),
    ('2026-11-28'::date, 'carB', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 4),
    ('2026-11-28'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-11-28'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-11-28'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-11-28'::date, 'carC', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 4),
    ('2026-11-28'::date, 'carC', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 5)
) as occupant(trip_date, car_key, person_name, party_name, role, sort_order)
join public.rental_car_daily_assignments assignment
  on assignment.trip_date = occupant.trip_date
 and assignment.car_key = occupant.car_key
on conflict (assignment_id, person_name) do update set
  party_name = excluded.party_name,
  role = excluded.role,
  sort_order = excluded.sort_order;

-- Future dates can be added in the Supabase Table Editor.
-- Set rental_car_days.status to:
--   planned      when arrangements are ready,
--   pending      when arrangements are still being decided,
--   not_required when no cars are needed.
