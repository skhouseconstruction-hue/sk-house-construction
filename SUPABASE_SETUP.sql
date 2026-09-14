-- SK House Construction - base de datos en línea
create table if not exists public.company_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);

alter table public.company_state enable row level security;

drop policy if exists "Users can read their own company state" on public.company_state;
drop policy if exists "Users can insert their own company state" on public.company_state;
drop policy if exists "Users can update their own company state" on public.company_state;

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

-- Roles de cuenta: una sola cuenta maestra para SK House Construction.
create table if not exists public.company_user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'user' check (role in ('admin','user')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.company_user_roles enable row level security;

create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and lower(coalesce(u.email,'')) = lower('skhouseconstruction@gmail.com')
  )
  or exists (
    select 1
    from public.company_user_roles r
    where r.user_id = auth.uid() and r.role = 'admin'
  );
$$;

revoke all on function public.is_company_admin() from public;
grant execute on function public.is_company_admin() to authenticated;

drop policy if exists "Users can read their own company role" on public.company_user_roles;
drop policy if exists "Admins can read company roles" on public.company_user_roles;
drop policy if exists "Admins can manage company roles" on public.company_user_roles;

create policy "Users can read their own company role"
on public.company_user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read company roles"
on public.company_user_roles for select
to authenticated
using (public.is_company_admin());

create policy "Admins can manage company roles"
on public.company_user_roles for all
to authenticated
using (public.is_company_admin())
with check (public.is_company_admin());

-- Registra explícitamente como admin a la cuenta maestra si ya existe.
insert into public.company_user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(coalesce(email,'')) = lower('skhouseconstruction@gmail.com')
on conflict (user_id) do update set role='admin', updated_at=now();

notify pgrst, 'reload schema';
