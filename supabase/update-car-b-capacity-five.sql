begin;

update public.rental_cars
set capacity = 5
where car_key = 'carB';

commit;
