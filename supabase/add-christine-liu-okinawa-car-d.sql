begin;

-- Christine joins Okinawa from Nov 27 through Dec 2 and rides in Car D.
insert into public.rental_car_days (trip_date, segment_key, status)
values
  ('2026-11-27'::date, 'onna', 'planned'),
  ('2026-11-28'::date, 'onna', 'planned'),
  ('2026-11-29'::date, 'onna', 'planned'),
  ('2026-11-30'::date, 'nago', 'planned'),
  ('2026-12-01'::date, 'nago', 'planned'),
  ('2026-12-02'::date, 'nanjo', 'planned')
on conflict (trip_date) do update set
  segment_key = excluded.segment_key,
  status = excluded.status,
  updated_at = now();

insert into public.rental_car_daily_assignments (trip_date, car_key, notes, sort_order)
select trip_date::date, 'carD', null, 4
from generate_series('2026-11-27'::date, '2026-12-02'::date, interval '1 day') as dates(trip_date)
on conflict (trip_date, car_key) do update set
  sort_order = excluded.sort_order;

-- Remove any old Christine assignment through Dec 4 before rebuilding the shorter stay.
delete from public.rental_car_occupants as occupant
using public.rental_car_daily_assignments as assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date between '2026-11-27'::date and '2026-12-04'::date
  and lower(trim(occupant.person_name)) in ('christine', 'christine liu');

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
  coalesce((
    select max(existing.sort_order) + 1
    from public.rental_car_occupants as existing
    where existing.assignment_id = assignment.id
  ), 1)
from public.rental_car_daily_assignments as assignment
where assignment.trip_date between '2026-11-27'::date and '2026-12-02'::date
  and assignment.car_key = 'carD'
on conflict (assignment_id, person_name) do update set
  party_name = excluded.party_name,
  role = excluded.role,
  sort_order = excluded.sort_order;

-- Remove empty Car D rows that may remain if the earlier Dec 4 version was run.
delete from public.rental_car_daily_assignments as assignment
where assignment.car_key = 'carD'
  and assignment.trip_date between '2026-12-03'::date and '2026-12-04'::date
  and not exists (
    select 1
    from public.rental_car_occupants as occupant
    where occupant.assignment_id = assignment.id
  );

commit;
