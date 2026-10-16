begin;

-- Remove Steven from every rental-car arrangement from Nov 30 onward.
delete from public.rental_car_occupants occupant
using public.rental_car_daily_assignments assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date >= '2026-11-30'::date
  and (
    lower(trim(occupant.person_name)) = 'steven'
    or occupant.party_name = 'Steven Wang'
  );

commit;
