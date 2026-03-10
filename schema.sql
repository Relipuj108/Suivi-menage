create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee text not null check (assignee in ('Mathieu', 'Sarah')),
  due_date date not null,
  repeat_days integer not null default 0 check (repeat_days >= 0),
  status text not null default 'pending',
  notes text null,
  last_completed_at date null,
  created_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists alternate_assignee boolean not null default false;

alter table public.tasks
drop constraint if exists tasks_status_check;

alter table public.tasks
add constraint tasks_status_check
check (status in ('pending', 'done', 'inactive'));

alter table public.tasks enable row level security;

drop policy if exists "public read tasks" on public.tasks;
drop policy if exists "public insert tasks" on public.tasks;
drop policy if exists "public update tasks" on public.tasks;
drop policy if exists "public delete tasks" on public.tasks;

create policy "public read tasks"
on public.tasks
for select
to anon
using (true);

create policy "public insert tasks"
on public.tasks
for insert
to anon
with check (true);

create policy "public update tasks"
on public.tasks
for update
to anon
using (true)
with check (true);

create policy "public delete tasks"
on public.tasks
for delete
to anon
using (true);

create table if not exists public.device_settings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  hide_new_task boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.device_settings enable row level security;

drop policy if exists "public read device_settings" on public.device_settings;
drop policy if exists "public insert device_settings" on public.device_settings;
drop policy if exists "public update device_settings" on public.device_settings;
drop policy if exists "public delete device_settings" on public.device_settings;

create policy "public read device_settings"
on public.device_settings
for select
to anon
using (true);

create policy "public insert device_settings"
on public.device_settings
for insert
to anon
with check (true);

create policy "public update device_settings"
on public.device_settings
for update
to anon
using (true)
with check (true);

create policy "public delete device_settings"
on public.device_settings
for delete
to anon
using (true);
