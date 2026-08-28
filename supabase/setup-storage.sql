-- Private buckets for catalog PDFs and invoice photos.
-- Safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'catalogs',
    'catalogs',
    false,
    52428800,
    array['application/pdf']::text[]
  ),
  (
    'invoices',
    'invoices',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
  )
on conflict (id) do nothing;

drop policy if exists catalogs_select_authenticated on storage.objects;
drop policy if exists catalogs_insert_authenticated on storage.objects;
drop policy if exists catalogs_update_authenticated on storage.objects;
drop policy if exists invoices_select_authenticated on storage.objects;
drop policy if exists invoices_insert_authenticated on storage.objects;

create policy catalogs_select_authenticated
  on storage.objects for select
  to authenticated
  using (bucket_id = 'catalogs');

create policy catalogs_insert_authenticated
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'catalogs');

create policy catalogs_update_authenticated
  on storage.objects for update
  to authenticated
  using (bucket_id = 'catalogs');

create policy invoices_select_authenticated
  on storage.objects for select
  to authenticated
  using (bucket_id = 'invoices');

create policy invoices_insert_authenticated
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'invoices');
