create table if not exists public.reservation_checklist_progress (
  id uuid primary key default gen_random_uuid(),
  trip_key text not null,
  guest text not null,
  item_key text not null,
  checked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (trip_key, guest, item_key)
);

create index if not exists reservation_checklist_progress_trip_guest_idx
  on public.reservation_checklist_progress (trip_key, guest);

alter table public.reservation_checklist_progress enable row level security;

drop policy if exists "Reservation checklist progress is readable"
  on public.reservation_checklist_progress;
create policy "Reservation checklist progress is readable"
  on public.reservation_checklist_progress
  for select
  using (true);

drop policy if exists "Reservation checklist progress can be inserted"
  on public.reservation_checklist_progress;
create policy "Reservation checklist progress can be inserted"
  on public.reservation_checklist_progress
  for insert
  with check (true);

drop policy if exists "Reservation checklist progress can be updated"
  on public.reservation_checklist_progress;
create policy "Reservation checklist progress can be updated"
  on public.reservation_checklist_progress
  for update
  using (true)
  with check (true);
