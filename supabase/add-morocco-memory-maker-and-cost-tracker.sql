alter table public.memory_maker_files
  drop constraint if exists memory_maker_files_album_key_check;

alter table public.memory_maker_files
  add constraint memory_maker_files_album_key_check
  check (album_key in ('taiwanNovember', 'japanNovember', 'taiwanDecember', 'moroccoSeptember'));

create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_key text not null check (trip_key in ('morocco')),
  description text not null,
  amount_cad numeric(10, 2) check (amount_cad > 0),
  amount_local numeric(12, 2) check (amount_local is null or amount_local > 0),
  amount_usd numeric(12, 2) check (amount_usd is null or amount_usd > 0),
  exchange_rate_to_cad numeric(16, 8) check (exchange_rate_to_cad > 0),
  converted_amount_cad numeric(12, 2) check (converted_amount_cad > 0),
  paid_by text not null,
  created_at timestamptz not null default now(),
  check (
    ((amount_cad is not null)::integer + (amount_local is not null)::integer + (amount_usd is not null)::integer) = 1
  )
);

alter table public.trip_expenses enable row level security;

drop policy if exists "Trip expenses are readable" on public.trip_expenses;
create policy "Trip expenses are readable"
  on public.trip_expenses for select
  using (true);

drop policy if exists "Trip expenses can be inserted" on public.trip_expenses;
create policy "Trip expenses can be inserted"
  on public.trip_expenses for insert
  with check (true);
