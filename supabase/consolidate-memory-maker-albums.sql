alter table public.memory_maker_files
  drop constraint if exists memory_maker_files_album_key_check;

update public.memory_maker_files
set album_key = case
  when album_key in ('xiaoliuqiu', 'taiwanNovember') then 'taiwanNovember'
  when album_key in ('onna', 'nago', 'nanjo', 'naha', 'nahaearly', 'okinawa', 'japanNovember') then 'japanNovember'
  when album_key in ('yilan', 'taiwanDecember') then 'taiwanDecember'
  else album_key
end;

alter table public.memory_maker_files
  add constraint memory_maker_files_album_key_check
  check (album_key in ('taiwanNovember', 'japanNovember', 'taiwanDecember'));
