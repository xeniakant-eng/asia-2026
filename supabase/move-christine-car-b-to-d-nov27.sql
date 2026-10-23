begin;

-- Keep only one Nov 27 assignment for Christine Liu.
delete from public.rental_car_occupants as occupant
using public.rental_car_daily_assignments as assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date = '2026-11-27'::date
  and lower(trim(occupant.person_name)) in ('christine', 'christine liu');

-- Move Christine from Car B to Car D after Heather and Kaien.
insert into public.rental_car_occupants (
  assignment_id,
  person_name,
  party_name,
  role,
  sort_order
)
select
  assignment.id,
  'Christine Liu',
  'Christine Liu',
  'passenger',
  3
from public.rental_car_daily_assignments as assignment
where assignment.trip_date = '2026-11-27'::date
  and assignment.car_key = 'carD'
on conflict (assignment_id, person_name) do update set
  party_name = excluded.party_name,
  role = excluded.role,
  sort_order = excluded.sort_order;

commit;
