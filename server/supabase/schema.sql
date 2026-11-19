-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- Las cuentas viven en auth.users (Supabase Auth). Estas tablas guardan el perfil
-- de cada tipo de cuenta, con el mismo id que auth.users.

create table if not exists public.clientes (
  id      uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null,
  email   text not null,
  creado  timestamptz not null default now()
);

create table if not exists public.vendedores (
  id      uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null,
  rfc     text not null unique,
  email   text not null,
  creado  timestamptz not null default now()
);

-- Row Level Security: cada cuenta solo ve y edita su propia fila.
alter table public.clientes enable row level security;
alter table public.vendedores enable row level security;

drop policy if exists "clientes: ver propio perfil" on public.clientes;
create policy "clientes: ver propio perfil" on public.clientes
  for select using (auth.uid() = id);
drop policy if exists "clientes: editar propio perfil" on public.clientes;
create policy "clientes: editar propio perfil" on public.clientes
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "vendedores: ver propio perfil" on public.vendedores;
create policy "vendedores: ver propio perfil" on public.vendedores
  for select using (auth.uid() = id);
drop policy if exists "vendedores: editar propio perfil" on public.vendedores;
create policy "vendedores: editar propio perfil" on public.vendedores
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Crea el perfil automáticamente al registrarse. El tipo y los datos llegan
-- en raw_user_meta_data (signUp options.data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data->>'tipo' = 'vendedor' then
    insert into public.vendedores (id, nombre, rfc, email)
    values (
      new.id,
      new.raw_user_meta_data->>'nombre',
      new.raw_user_meta_data->>'rfc',
      new.email
    );
  else
    insert into public.clientes (id, nombre, email)
    values (new.id, new.raw_user_meta_data->>'nombre', new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comprueba si un RFC está libre sin exponer las filas de otros vendedores.
create or replace function public.rfc_disponible(rfc_in text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.vendedores where rfc = upper(rfc_in));
$$;

grant execute on function public.rfc_disponible(text) to anon, authenticated;

-- Cuentas creadas ANTES de existir el trigger: crea su perfil según el tipo guardado.
-- Sin perfil, la cuenta no tiene tipo y la app la trata como no iniciada.
insert into public.vendedores (id, nombre, rfc, email)
select u.id,
       coalesce(u.raw_user_meta_data->>'nombre', u.email),
       upper(u.raw_user_meta_data->>'rfc'),
       u.email
from auth.users u
where u.raw_user_meta_data->>'tipo' = 'vendedor'
  and not exists (select 1 from public.vendedores v where v.id = u.id)
on conflict (id) do nothing;

insert into public.clientes (id, nombre, email)
select u.id,
       coalesce(u.raw_user_meta_data->>'nombre', u.email),
       u.email
from auth.users u
where coalesce(u.raw_user_meta_data->>'tipo', 'cliente') = 'cliente'
  and not exists (select 1 from public.clientes c where c.id = u.id)
on conflict (id) do nothing;
