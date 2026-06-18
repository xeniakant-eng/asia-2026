update public.rental_cars
set capacity = 7
where car_key in ('carA', 'carB', 'carC', 'carD');

insert into public.rental_car_daily_assignments (trip_date, car_key, notes, sort_order)
values
  ('2026-11-27', 'carA', null, 1),
  ('2026-11-27', 'carB', null, 2),
  ('2026-11-27', 'carC', null, 3),
  ('2026-11-27', 'carD', null, 4),
  ('2026-11-28', 'carA', 'Blue Cave', 1),
  ('2026-11-28', 'carB', 'Blue Cave', 2),
  ('2026-11-28', 'carC', 'Ryukyu Mura', 3),
  ('2026-11-28', 'carD', 'Spare car', 4),
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
  ('2026-12-03', 'carC', 'Spare car', 2),
  ('2026-12-03', 'carD', null, 3)
on conflict (trip_date, car_key) do update set
  notes = excluded.notes,
  sort_order = excluded.sort_order;

delete from public.rental_car_occupants occupant
using public.rental_car_daily_assignments assignment
where occupant.assignment_id = assignment.id
  and assignment.trip_date in ('2026-11-27', '2026-11-28', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03');

insert into public.rental_car_occupants (assignment_id, person_name, party_name, role, sort_order)
select assignment.id, occupant.person_name, occupant.party_name, occupant.role, occupant.sort_order
from (
  values
    ('2026-11-27'::date, 'carA', 'Mark', 'Mark Wang', 'driver', 1),
    ('2026-11-27'::date, 'carA', 'Steven', 'Steven Wang', 'passenger', 2),
    ('2026-11-27'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-11-27'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-11-27'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-11-27'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-11-27'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-11-27'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-11-27'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'driver', 1),
    ('2026-11-27'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 2),
    ('2026-11-27'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 3),
    ('2026-11-27'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 4),
    ('2026-11-27'::date, 'carD', 'Norma', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 5),

    ('2026-11-28'::date, 'carA', 'Mark', 'Mark Wang', 'driver', 1),
    ('2026-11-28'::date, 'carA', 'Steven', 'Steven Wang', 'passenger', 2),
    ('2026-11-28'::date, 'carA', 'Christine', 'Anthony & Christine & Mona (1)', 'passenger', 3),
    ('2026-11-28'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-11-28'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-11-28'::date, 'carB', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 3),
    ('2026-11-28'::date, 'carB', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 4),
    ('2026-11-28'::date, 'carB', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 5),
    ('2026-11-28'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-11-28'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-11-28'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),

    ('2026-11-30'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-11-30'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-11-30'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-11-30'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-11-30'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-11-30'::date, 'carB', 'Steven', 'Steven Wang', 'passenger', 6),
    ('2026-11-30'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-11-30'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-11-30'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-11-30'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'driver', 1),
    ('2026-11-30'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 2),
    ('2026-11-30'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 3),
    ('2026-11-30'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 4),
    ('2026-11-30'::date, 'carD', 'Norma', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 5),

    ('2026-12-01'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-01'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-01'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-01'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-01'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-01'::date, 'carB', 'Steven', 'Steven Wang', 'passenger', 6),
    ('2026-12-01'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-01'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-01'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-12-01'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'driver', 1),
    ('2026-12-01'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 2),
    ('2026-12-01'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 3),
    ('2026-12-01'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 4),
    ('2026-12-01'::date, 'carD', 'Norma', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 5),

    ('2026-12-02'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-02'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-02'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-02'::date, 'carB', 'Mei', 'Mei & Emilia (8)', 'passenger', 4),
    ('2026-12-02'::date, 'carB', 'Emilia', 'Mei & Emilia (8)', 'passenger', 5),
    ('2026-12-02'::date, 'carB', 'Steven', 'Steven Wang', 'passenger', 6),
    ('2026-12-02'::date, 'carC', 'Christina', 'Dave & Christina & Xixi (2)', 'driver', 1),
    ('2026-12-02'::date, 'carC', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 2),
    ('2026-12-02'::date, 'carC', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 3),
    ('2026-12-02'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'driver', 1),
    ('2026-12-02'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 2),
    ('2026-12-02'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 3),
    ('2026-12-02'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 4),
    ('2026-12-02'::date, 'carD', 'Norma', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 5),

    ('2026-12-03'::date, 'carB', 'David', 'Xenia & David & Naomi (3)', 'driver', 1),
    ('2026-12-03'::date, 'carB', 'Xenia', 'Xenia & David & Naomi (3)', 'passenger', 2),
    ('2026-12-03'::date, 'carB', 'Naomi', 'Xenia & David & Naomi (3)', 'passenger', 3),
    ('2026-12-03'::date, 'carB', 'Christina', 'Dave & Christina & Xixi (2)', 'passenger', 4),
    ('2026-12-03'::date, 'carB', 'Dave', 'Dave & Christina & Xixi (2)', 'passenger', 5),
    ('2026-12-03'::date, 'carB', 'Xixi', 'Dave & Christina & Xixi (2)', 'passenger', 6),
    ('2026-12-03'::date, 'carD', 'Heather', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'driver', 1),
    ('2026-12-03'::date, 'carD', 'Jack', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 2),
    ('2026-12-03'::date, 'carD', 'Aizen', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 3),
    ('2026-12-03'::date, 'carD', 'Kaien', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 4),
    ('2026-12-03'::date, 'carD', 'Norma', 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'passenger', 5),
    ('2026-12-03'::date, 'carD', 'Mei', 'Mei & Emilia (8)', 'passenger', 6),
    ('2026-12-03'::date, 'carD', 'Emilia', 'Mei & Emilia (8)', 'passenger', 7)
) as occupant(trip_date, car_key, person_name, party_name, role, sort_order)
join public.rental_car_daily_assignments assignment
  on assignment.trip_date = occupant.trip_date
 and assignment.car_key = occupant.car_key
on conflict (assignment_id, person_name) do update set
  party_name = excluded.party_name,
  role = excluded.role,
  sort_order = excluded.sort_order;
