begin;

update public.rental_car_daily_assignments
set notes = 'Return to HV Rent-A-Car Naha Airport Office at 8:00 AM'
where trip_date = '2026-12-06'::date
  and car_key in ('carB', 'carC');

commit;
