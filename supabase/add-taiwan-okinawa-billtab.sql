alter table public.trip_expenses
  drop constraint if exists trip_expenses_trip_key_check;

alter table public.trip_expenses
  add constraint trip_expenses_trip_key_check
  check (trip_key in ('morocco', 'taiwan', 'okinawaJapan'));
