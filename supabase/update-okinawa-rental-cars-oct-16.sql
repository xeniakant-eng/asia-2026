begin;

-- Car D is a five-seat vehicle.
update public.rental_cars
set capacity = 5
where car_key = 'carD';

-- Car C is not available until Dave, Christina, and Xixi arrive on Nov 28.
-- Deleting the Nov 27 assignment also removes its occupants through the FK cascade.
delete from public.rental_car_daily_assignments
where car_key = 'carC'
  and trip_date < '2026-11-28'::date;

-- Heather and Kaien leave after Dec 2.
delete from public.rental_car_occupants as occupant
using public.rental_car_daily_assignments as assignment
where occupant.assignment_id = assignment.id
  and occupant.party_name = 'Heather & Kaien (3)'
  and assignment.trip_date > '2026-12-02'::date;

-- Ensure Christine Liu has only one Nov 27 assignment before placing her in Car B.
delete from public.rental_car_occupants as occupant
using public.rental_car_daily_assignments as assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date = '2026-11-27'::date
  and lower(trim(occupant.person_name)) in ('christine', 'christine liu');

insert into public.rental_car_occupants (assignment_id, person_name, party_name, role, sort_order)
select assignment.id, 'Christine Liu', 'Christine Liu', 'passenger', 4
from public.rental_car_daily_assignments as assignment
where assignment.trip_date = '2026-11-27'::date
  and assignment.car_key = 'carB'
on conflict (assignment_id, person_name) do update set
  party_name = excluded.party_name,
  role = excluded.role,
  sort_order = excluded.sort_order;

-- Replace the complete Nov 28 plan; Car B remains spare.
insert into public.rental_car_daily_assignments (trip_date, car_key, notes, sort_order)
values
  ('2026-11-28'::date, 'carA', 'Blue Cave', 1),
  ('2026-11-28'::date, 'carB', 'Spare car', 2),
  ('2026-11-28'::date, 'carC', null, 3),
  ('2026-11-28'::date, 'carD', null, 4)
on conflict (trip_date, car_key) do update set
  notes = excluded.notes,
  sort_order = excluded.sort_order;

delete from public.rental_car_occupants as occupant
using public.rental_car_daily_assignments as assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date = '2026-11-28'::date;

insert into public.rental_car_occupants (assignment_id, person_name, party_name, role, sort_order)
select assignment.id, occupant.person_name, occupant.party_name, occupant.role, occupant.sort_order
from (
  values
    ('carA', 'Mark', 'Mark Wang', 'driver', 1),
    ('carA', 'Steven', 'Steven Wang', 'passenger', 2),
    ('carA', 'Christine Liu', 'Christine Liu', 'passenger', 3),
    ('carA', 'David', 'Xenia & David & Naomi (3)', 'passenger', 4),
    ('carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('carD', 'Heather', 'Heather & Kaien (3)', 'driver', 1),
    ('carD', 'Kaien', 'Heather & Kaien (3)', 'passenger', 2),
    ('carD', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('carD', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 4)
) as occupant(car_key, person_name, party_name, role, sort_order)
join public.rental_car_daily_assignments as assignment
  on assignment.trip_date = '2026-11-28'::date
 and assignment.car_key = occupant.car_key
on conflict (assignment_id, person_name) do update set
  party_name = excluded.party_name,
  role = excluded.role,
  sort_order = excluded.sort_order;

-- Steven is not included in any car arrangement from Nov 30 onward.
delete from public.rental_car_occupants as occupant
using public.rental_car_daily_assignments as assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date >= '2026-11-30'::date
  and (
    lower(trim(occupant.person_name)) = 'steven'
    or occupant.party_name = 'Steven Wang'
  );

commit;
