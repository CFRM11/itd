-- Ejecutar en el SQL Editor de Supabase DESPUÉS de inventario.sql y storage.sql.
-- Cantidad de unidades por artículo (el alta por foto la llena con lo que cuenta Gemini).

alter table public.inventario
  add column if not exists cantidad integer not null default 1
  check (cantidad >= 0 and cantidad <= 9999);
