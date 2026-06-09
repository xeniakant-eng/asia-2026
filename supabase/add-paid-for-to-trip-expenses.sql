alter table public.trip_expenses
  add column if not exists paid_for text not null default 'Everyone';

update public.trip_expenses
set paid_for = 'Everyone'
where paid_for is null or btrim(paid_for) = '';
