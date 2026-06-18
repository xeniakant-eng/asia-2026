update public.rental_car_daily_assignments
set notes = null
where trip_date = '2026-12-02'
  and car_key = 'carD';
