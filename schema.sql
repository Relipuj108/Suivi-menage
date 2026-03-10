create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee text null,
  due_date date not null,
  repeat_days integer not null default 0 check (repeat_days >= 0),
  status text not null default 'pending' check (status in ('pending', 'done')),
  notes text null,
  last_completed_at date null,
  created_at timestamptz not null default now()
);

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

alter publication supabase_realtime add table public.tasks;
