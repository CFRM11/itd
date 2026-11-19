-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema.sql.
-- Inventario/catálogo: cada vendedor tiene sus propios artículos.

create table if not exists public.inventario (
  id                 uuid primary key default gen_random_uuid(),
  vendedor_id         uuid not null references public.vendedores (id) on delete cascade,
  nombre             text not null check (char_length(nombre) between 1 and 120),
  descripcion        text not null default '' check (char_length(descripcion) <= 1000),
  imagen_url         text check (imagen_url is null or imagen_url ~* '^https?://'),
  imagen_descripcion text not null default '' check (char_length(imagen_descripcion) <= 200),
  precio             numeric(12, 2) not null check (precio >= 0),
  tipo               text not null check (tipo in ('producto', 'servicio')),
  creado             timestamptz not null default now(),
  actualizado        timestamptz not null default now()
);

create index if not exists inventario_vendedor_idx on public.inventario (vendedor_id);

alter table public.inventario enable row level security;

-- Catálogo público: cualquiera puede leer los artículos (también sin sesión).
drop policy if exists "inventario: catálogo público" on public.inventario;
create policy "inventario: catálogo público" on public.inventario
  for select using (true);

-- Solo el vendedor dueño puede crear, editar y borrar sus artículos.
drop policy if exists "inventario: insertar propio" on public.inventario;
create policy "inventario: insertar propio" on public.inventario
  for insert with check (vendedor_id = auth.uid());

drop policy if exists "inventario: editar propio" on public.inventario;
create policy "inventario: editar propio" on public.inventario
  for update using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());

drop policy if exists "inventario: borrar propio" on public.inventario;
create policy "inventario: borrar propio" on public.inventario
  for delete using (vendedor_id = auth.uid());
