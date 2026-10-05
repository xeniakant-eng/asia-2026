begin;

-- Steven's Okinawa trip now ends on Nov 30. Keep Nov 30 assignments,
-- but remove him from every rental-car arrangement after that date.
delete from public.rental_car_occupants occupant
using public.rental_car_daily_assignments assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date > '2026-11-30'::date
  and (
    lower(trim(occupant.person_name)) = 'steven'
    or occupant.party_name = 'Steven Wang'
  );

commit;
