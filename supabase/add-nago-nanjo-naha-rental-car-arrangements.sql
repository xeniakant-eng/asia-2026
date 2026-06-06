insert into public.rental_car_days (trip_date, segment_key, status)
values
  ('2026-11-30', 'nago', 'planned'),
  ('2026-12-01', 'nago', 'planned'),
  ('2026-12-02', 'nanjo', 'planned'),
  ('2026-12-03', 'nanjo', 'planned'),
  ('2026-12-04', 'naha', 'planned'),
  ('2026-12-05', 'naha', 'planned'),
  ('2026-12-06', 'naha', 'planned')
on conflict (trip_date) do update set
  segment_key = excluded.segment_key,
  status = excluded.status,
  updated_at = now();

-- Keep this migration safe to rerun by replacing only these dates.
delete from public.rental_car_daily_assignments
where trip_date between '2026-11-30' and '2026-12-06';

insert into public.rental_car_daily_assignments (trip_date, car_key, notes, sort_order)
values
  ('2026-11-30', 'carB', null, 1),
  ('2026-11-30', 'carC', null, 2),
  ('2026-11-30', 'carD', null, 3),
  ('2026-12-01', 'carB', null, 1),
  ('2026-12-01', 'carC', null, 2),
  ('2026-12-01', 'carD', null, 3),
  ('2026-12-02', 'carB', null, 1),
  ('2026-12-02', 'carC', null, 2),
  ('2026-12-02', 'carD', 'Returning Naha for rental return and departure', 3),
  ('2026-12-03', 'carB', null, 1),
  ('2026-12-03', 'carC', null, 2),
  ('2026-12-04', 'carB', null, 1),
  ('2026-12-04', 'carC', null, 2),
  ('2026-12-05', 'carB', null, 1),
  ('2026-12-05', 'carC', null, 2),
  ('2026-12-06', 'carB', 'Return rental at Naha Airport', 1),
  ('2026-12-06', 'carC', 'Return rental at Naha Airport', 2);

insert into public.rental_car_occupants (assignment_id, person_name, party_name, role, sort_order)
select assignment.id, occupant.person_name, occupant.party_name, occupant.role, occupant.sort_order
from (
  values
    ('2026-11-30'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-11-30'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-11-30'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-11-30'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-11-30'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-11-30'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-11-30'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-11-30'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-11-30'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3)', 'driver', 1),
    ('2026-11-30'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 2),
    ('2026-11-30'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 3),
    ('2026-11-30'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 4),
    ('2026-11-30'::date, 'carD', 'Steven', 'Steven Wang', 'passenger', 5),

    ('2026-12-01'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-01'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-01'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-01'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-01'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-01'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-01'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-01'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-12-01'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3)', 'driver', 1),
    ('2026-12-01'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 2),
    ('2026-12-01'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 3),
    ('2026-12-01'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 4),
    ('2026-12-01'::date, 'carD', 'Steven', 'Steven Wang', 'passenger', 5),

    ('2026-12-02'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-02'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-02'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-02'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-02'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-02'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-02'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-02'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-12-02'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3)', 'driver', 1),
    ('2026-12-02'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 2),
    ('2026-12-02'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 3),
    ('2026-12-02'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3)', 'passenger', 4),
    ('2026-12-02'::date, 'carD', 'Steven', 'Steven Wang', 'passenger', 5),

    ('2026-12-03'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-03'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-03'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-03'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-03'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-03'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-03'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-03'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),

    ('2026-12-04'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-04'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-04'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-04'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-04'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-04'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-04'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-04'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),

    ('2026-12-05'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-05'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-05'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-05'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-05'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-05'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-05'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-05'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),

    ('2026-12-06'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-06'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-06'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-06'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-06'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-06'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-06'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-06'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3)
) as occupant(trip_date, car_key, person_name, party_name, role, sort_order)
join public.rental_car_daily_assignments assignment
  on assignment.trip_date = occupant.trip_date
 and assignment.car_key = occupant.car_key;
