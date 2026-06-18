update public.rental_car_occupants occupant
set
  person_name = 'Christine Liu',
  party_name = 'Christine Liu'
from public.rental_car_daily_assignments assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date = '2026-11-28'
  and assignment.car_key = 'carA'
  and occupant.person_name = 'Christine';
