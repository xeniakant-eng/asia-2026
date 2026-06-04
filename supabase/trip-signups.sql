create table if not exists public.trip_signups (
  id uuid primary key default gen_random_uuid(),
  trip_key text not null check (trip_key in ('morocco', 'houston', 'azoresPortugal', 'similanThailand', 'fiveStans')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (trip_key, name)
);

alter table public.trip_signups enable row level security;

create policy "Trip signups are readable"
  on public.trip_signups
  for select
  using (true);

create policy "Trip signups can be inserted"
  on public.trip_signups
  for insert
  with check (true);
