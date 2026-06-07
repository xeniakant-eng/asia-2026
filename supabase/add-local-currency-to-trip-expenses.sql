alter table public.trip_expenses
  add column if not exists amount_local numeric(12, 2);

alter table public.trip_expenses
  add column if not exists amount_usd numeric(12, 2);

alter table public.trip_expenses
  add column if not exists exchange_rate_to_cad numeric(16, 8);

alter table public.trip_expenses
  add column if not exists converted_amount_cad numeric(12, 2);

alter table public.trip_expenses
  alter column amount_cad drop not null;

alter table public.trip_expenses
  drop constraint if exists trip_expenses_amount_local_check;

alter table public.trip_expenses
  add constraint trip_expenses_amount_local_check
  check (amount_local is null or amount_local > 0);

alter table public.trip_expenses
  drop constraint if exists trip_expenses_amount_usd_check;

alter table public.trip_expenses
  add constraint trip_expenses_amount_usd_check
  check (amount_usd is null or amount_usd > 0);

alter table public.trip_expenses
  drop constraint if exists trip_expenses_has_one_amount_check;

alter table public.trip_expenses
  add constraint trip_expenses_has_one_amount_check
  check (
    ((amount_cad is not null)::integer + (amount_local is not null)::integer + (amount_usd is not null)::integer) = 1
  );

update public.trip_expenses
set exchange_rate_to_cad = 1,
    converted_amount_cad = amount_cad
where amount_cad is not null
  and converted_amount_cad is null;

alter table public.trip_expenses
  drop constraint if exists trip_expenses_exchange_rate_to_cad_check;

alter table public.trip_expenses
  add constraint trip_expenses_exchange_rate_to_cad_check
  check (exchange_rate_to_cad is null or exchange_rate_to_cad > 0);

alter table public.trip_expenses
  drop constraint if exists trip_expenses_converted_amount_cad_check;

alter table public.trip_expenses
  add constraint trip_expenses_converted_amount_cad_check
  check (converted_amount_cad is null or converted_amount_cad > 0);
