create table if not exists public.checklist_progress (
  id uuid primary key default gen_random_uuid(),
  guest text not null,
  item_key text not null,
  checked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (guest, item_key)
);

alter table public.checklist_progress enable row level security;

create policy "Checklist progress is readable"
  on public.checklist_progress
  for select
  using (true);

create policy "Checklist progress can be inserted"
  on public.checklist_progress
  for insert
  with check (true);

create policy "Checklist progress can be updated"
  on public.checklist_progress
  for update
  using (true)
  with check (true);
