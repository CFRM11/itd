-- Ejecutar en el SQL Editor de Supabase DESPUÉS de inventario.sql.
-- Fotos de productos: bucket público (las URLs se pueden mostrar en el catálogo) y
-- cada vendedor solo sube, cambia y borra archivos dentro de su propia carpeta (su user id).

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "productos: subir a mi carpeta" on storage.objects;
create policy "productos: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "productos: cambiar en mi carpeta" on storage.objects;
create policy "productos: cambiar en mi carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "productos: borrar de mi carpeta" on storage.objects;
create policy "productos: borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);
