begin;

-- Remove Jack and Aizen from every persisted Okinawa car assignment.
delete from public.rental_car_occupants
where lower(trim(person_name)) in ('jack', 'aizen');

-- Rename the remaining party in all car arrangements.
update public.rental_car_occupants
set party_name = 'Heather & Kaien (3)'
where party_name in (
  'Heather & Jack & Aizen (8) & Kaien (3)',
  'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
);

-- Preserve packing-list progress under the renamed party and keys.
insert into public.checklist_progress (guest, item_key, checked, updated_at)
select
  'Heather & Kaien (3)',
  replace(
    replace(item_key, 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'Heather & Kaien (3)'),
    'Heather & Jack & Aizen (8) & Kaien (3)',
    'Heather & Kaien (3)'
  ),
  checked,
  updated_at
from public.checklist_progress
where guest in (
  'Heather & Jack & Aizen (8) & Kaien (3)',
  'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
)
on conflict (guest, item_key) do update set
  checked = checklist_progress.checked or excluded.checked,
  updated_at = greatest(checklist_progress.updated_at, excluded.updated_at);

delete from public.checklist_progress
where guest in (
  'Heather & Jack & Aizen (8) & Kaien (3)',
  'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
);

-- Preserve Okinawa reservation-checklist progress under the renamed party.
insert into public.reservation_checklist_progress (trip_key, guest, item_key, checked, updated_at)
select
  trip_key,
  'Heather & Kaien (3)',
  item_key,
  checked,
  updated_at
from public.reservation_checklist_progress
where trip_key = 'okinawaJapan'
  and guest in (
    'Heather & Jack & Aizen (8) & Kaien (3)',
    'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
  )
on conflict (trip_key, guest, item_key) do update set
  checked = reservation_checklist_progress.checked or excluded.checked,
  updated_at = greatest(reservation_checklist_progress.updated_at, excluded.updated_at);

delete from public.reservation_checklist_progress
where trip_key = 'okinawaJapan'
  and guest in (
    'Heather & Jack & Aizen (8) & Kaien (3)',
    'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
  );

-- Keep existing Okinawa BillTab and album attribution attached to the party.
update public.trip_expenses
set paid_by = 'Heather & Kaien (3)'
where trip_key = 'okinawaJapan'
  and paid_by in (
    'Heather & Jack & Aizen (8) & Kaien (3)',
    'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
  );

update public.trip_expenses
set paid_for = replace(
  replace(paid_for, 'Heather & Jack & Aizen (8) & Kaien (3) & Norma', 'Heather & Kaien (3)'),
  'Heather & Jack & Aizen (8) & Kaien (3)',
  'Heather & Kaien (3)'
)
where trip_key = 'okinawaJapan'
  and (
    paid_for like '%Heather & Jack & Aizen (8) & Kaien (3)%'
    or paid_for like '%Heather & Jack & Aizen (8) & Kaien (3) & Norma%'
  );

update public.memory_maker_files
set uploader = 'Heather & Kaien (3)'
where album_key = 'japanNovember'
  and uploader in (
    'Heather & Jack & Aizen (8) & Kaien (3)',
    'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
  );

commit;
