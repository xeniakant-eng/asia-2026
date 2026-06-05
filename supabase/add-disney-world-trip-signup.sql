alter table public.trip_signups
  drop constraint if exists trip_signups_trip_key_check;

alter table public.trip_signups
  add constraint trip_signups_trip_key_check
  check (trip_key in ('morocco', 'houston', 'azoresPortugal', 'similanThailand', 'disneyWorld', 'fiveStans'));
