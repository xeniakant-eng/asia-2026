alter table public.memory_maker_files
  drop constraint if exists memory_maker_files_album_key_check;

alter table public.memory_maker_files
  add constraint memory_maker_files_album_key_check
  check (album_key in ('taiwanNovember', 'japanNovember', 'taiwanDecember', 'moroccoSeptember', 'vietnamNovember', 'alaskaCruise'));

alter table public.trip_expenses
  drop constraint if exists trip_expenses_trip_key_check;

alter table public.trip_expenses
  add constraint trip_expenses_trip_key_check
  check (trip_key in ('morocco', 'taiwan', 'okinawaJapan', 'vietnam', 'alaskaCruise'));
