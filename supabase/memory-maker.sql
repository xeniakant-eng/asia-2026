create table if not exists public.memory_maker_files (
  id uuid primary key default gen_random_uuid(),
  album_key text not null check (album_key in ('xiaoliuqiu', 'onna', 'nago', 'nanjo', 'naha', 'nahaearly', 'yilan')),
  drive_file_id text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint,
  uploader text not null default 'Guest',
  created_at timestamptz not null default now()
);

alter table public.memory_maker_files enable row level security;

create policy "Memory Maker files are readable"
  on public.memory_maker_files
  for select
  using (true);

create policy "Memory Maker files can be inserted"
  on public.memory_maker_files
  for insert
  with check (true);
