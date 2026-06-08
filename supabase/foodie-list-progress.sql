create table if not exists public.foodie_list_progress (
  id uuid primary key default gen_random_uuid(),
  trip_key text not null,
  party_name text not null,
  item_key text not null,
  checked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (trip_key, party_name, item_key)
);

create index if not exists foodie_list_progress_trip_party_idx
  on public.foodie_list_progress (trip_key, party_name);

alter table public.foodie_list_progress enable row level security;

drop policy if exists "Foodie list progress is readable"
  on public.foodie_list_progress;
create policy "Foodie list progress is readable"
  on public.foodie_list_progress
  for select
  using (true);

drop policy if exists "Foodie list progress can be inserted"
  on public.foodie_list_progress;
create policy "Foodie list progress can be inserted"
  on public.foodie_list_progress
  for insert
  with check (true);

drop policy if exists "Foodie list progress can be updated"
  on public.foodie_list_progress;
create policy "Foodie list progress can be updated"
  on public.foodie_list_progress
  for update
  using (true)
  with check (true);

drop policy if exists "Foodie list progress can be deleted"
  on public.foodie_list_progress;
create policy "Foodie list progress can be deleted"
  on public.foodie_list_progress
  for delete
  using (true);
