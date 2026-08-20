-- SK House Construction - base de datos en línea
-- Ejecuta este script completo en Supabase > SQL Editor.
create table if not exists public.company_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.company_state enable row level security;

create policy "Users can read their own company state"
on public.company_state for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own company state"
on public.company_state for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own company state"
on public.company_state for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
