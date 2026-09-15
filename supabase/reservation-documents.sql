-- Private documents attached to owner-portal reservations.
create table if not exists public.reservation_documents (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  original_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  uploaded_at timestamptz not null default now()
);

create index if not exists reservation_documents_reservation_id_idx
  on public.reservation_documents(reservation_id);

alter table public.reservation_documents enable row level security;

drop policy if exists "Authenticated owners can read reservation documents"
  on public.reservation_documents;
create policy "Authenticated owners can read reservation documents"
  on public.reservation_documents for select
  to authenticated
  using (true);

drop policy if exists "Authenticated owners can add reservation documents"
  on public.reservation_documents;
create policy "Authenticated owners can add reservation documents"
  on public.reservation_documents for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated owners can update reservation documents"
  on public.reservation_documents;
create policy "Authenticated owners can update reservation documents"
  on public.reservation_documents for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated owners can delete reservation documents"
  on public.reservation_documents;
create policy "Authenticated owners can delete reservation documents"
  on public.reservation_documents for delete
  to authenticated
  using (true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'reservation-documents',
  'reservation-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain',
    'application/rtf',
    'text/rtf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated owners can read reservation document files"
  on storage.objects;
create policy "Authenticated owners can read reservation document files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'reservation-documents');

drop policy if exists "Authenticated owners can upload reservation document files"
  on storage.objects;
create policy "Authenticated owners can upload reservation document files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reservation-documents');

drop policy if exists "Authenticated owners can delete reservation document files"
  on storage.objects;
create policy "Authenticated owners can delete reservation document files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reservation-documents');
