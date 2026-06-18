insert into public.rental_car_days (trip_date, segment_key, status)
values ('2026-12-03', 'nanjo', 'planned')
on conflict (trip_date) do update set
  segment_key = excluded.segment_key,
  status = excluded.status,
  updated_at = now();

insert into public.rental_car_daily_assignments (trip_date, car_key, notes, sort_order)
values ('2026-12-03', 'carD', null, 3)
on conflict (trip_date, car_key) do update set
  notes = excluded.notes,
  sort_order = excluded.sort_order;

-- Safe to rerun: replace only Heather's Dec 3 car occupants and ensure Steven is not in a Dec 3 car.
delete from public.rental_car_occupants occupant
using public.rental_car_daily_assignments assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date = '2026-12-03'
  and (
    occupant.party_name = 'Heather & Jack & Aizen (8) & Kaien (3)'
    or occupant.person_name = 'Steven'
    or occupant.party_name = 'Steven Wang'
  );

insert into public.rental_car_occupants (assignment_id, person_name, party_name, role, sort_order)
select assignment.id, occupant.person_name, occupant.party_name, occupant.role, occupant.sort_order
from (
  values
    ('2026-12-03'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3)', 'driver', 1),
    ('2026-12-03'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 2),
    ('2026-12-03'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 3),
    ('2026-12-03'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 4)
) as occupant(trip_date, car_key, person_name, party_name, role, sort_order)
join public.rental_car_daily_assignments assignment
  on assignment.trip_date = occupant.trip_date
 and assignment.car_key = occupant.car_key
on conflict (assignment_id, person_name) do update set
  party_name = excluded.party_name,
  role = excluded.role,
  sort_order = excluded.sort_order;
