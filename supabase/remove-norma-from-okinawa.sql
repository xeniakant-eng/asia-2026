begin;

-- Remove Norma from every persisted Okinawa car assignment.
delete from public.rental_car_occupants
where lower(trim(person_name)) = 'norma';

-- Keep the remaining family members attached to their renamed party.
update public.rental_car_occupants
set party_name = 'Heather & Jack & Aizen (8) & Kaien (3)'
where party_name = 'Heather & Jack & Aizen (8) & Kaien (3) & Norma';

-- Preserve any completed packing-list items under the renamed party.
insert into public.checklist_progress (guest, item_key, checked, updated_at)
select
  'Heather & Jack & Aizen (8) & Kaien (3)',
  item_key,
  checked,
  updated_at
from public.checklist_progress
where guest = 'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
on conflict (guest, item_key) do update set
  checked = checklist_progress.checked or excluded.checked,
  updated_at = greatest(checklist_progress.updated_at, excluded.updated_at);

delete from public.checklist_progress
where guest = 'Heather & Jack & Aizen (8) & Kaien (3) & Norma';

-- Preserve Okinawa reservation-checklist progress under the renamed party.
insert into public.reservation_checklist_progress (trip_key, guest, item_key, checked, updated_at)
select
  trip_key,
  'Heather & Jack & Aizen (8) & Kaien (3)',
  item_key,
  checked,
  updated_at
from public.reservation_checklist_progress
where trip_key = 'okinawaJapan'
  and guest = 'Heather & Jack & Aizen (8) & Kaien (3) & Norma'
on conflict (trip_key, guest, item_key) do update set
  checked = reservation_checklist_progress.checked or excluded.checked,
  updated_at = greatest(reservation_checklist_progress.updated_at, excluded.updated_at);

delete from public.reservation_checklist_progress
where trip_key = 'okinawaJapan'
  and guest = 'Heather & Jack & Aizen (8) & Kaien (3) & Norma';

commit;
