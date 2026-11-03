do $$
declare
  target_id public.rental_car_daily_assignments.id%type;
begin
  select id into strict target_id
  from public.rental_car_daily_assignments
  where trip_date = date '2026-11-28' and car_key = 'carA';

  insert into public.rental_car_occupants
    (assignment_id, person_name, party_name, role, sort_order)
  select target_id, occupant.person_name, occupant.party_name, 'passenger',
    coalesce((select max(sort_order) + 1 from public.rental_car_occupants
              where assignment_id = target_id), 1)
  from public.rental_car_occupants occupant
  join public.rental_car_daily_assignments assignment on assignment.id = occupant.assignment_id
  where assignment.trip_date = date '2026-11-28'
    and assignment.car_key = 'carD' and occupant.person_name = 'Christine Liu'
  on conflict (assignment_id, person_name) do nothing;

  if not exists (select 1 from public.rental_car_occupants
                 where assignment_id = target_id and person_name = 'Christine Liu') then
    raise exception 'Christine Liu was not found in Car A or Car D on Nov 28';
  end if;

  delete from public.rental_car_occupants occupant
  using public.rental_car_daily_assignments assignment
  where occupant.assignment_id = assignment.id
    and assignment.trip_date = date '2026-11-28'
    and assignment.car_key = 'carD' and occupant.person_name = 'Christine Liu';
end
$$;
