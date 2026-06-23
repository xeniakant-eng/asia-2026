alter table public.trip_signups
  drop constraint if exists trip_signups_trip_key_check;

alter table public.trip_signups
  add constraint trip_signups_trip_key_check
  check (trip_key in ('morocco', 'vietnam', 'skiMyoko', 'skiDeerValley', 'skiBig3', 'panama', 'houston', 'azoresPortugal', 'similanThailand', 'centralVietnam', 'disneyWorld', 'fiveStans'));
