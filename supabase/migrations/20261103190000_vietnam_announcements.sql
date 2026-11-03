create table public.vietnam_announcements (
  id uuid primary key default gen_random_uuid(),
  day date not null check (day between date '2026-11-12' and date '2026-11-20'),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  author text not null check (char_length(btrim(author)) between 1 and 150),
  owner_hash text not null check (owner_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index vietnam_announcements_day_created_idx
  on public.vietnam_announcements (day, created_at desc, id desc);

alter table public.vietnam_announcements enable row level security;
revoke all on public.vietnam_announcements from public, anon, authenticated;
grant select, insert, delete on public.vietnam_announcements to service_role;