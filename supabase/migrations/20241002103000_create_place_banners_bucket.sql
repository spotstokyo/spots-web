-- Create the storage bucket used for explore banner uploads (if it does not exist yet)
insert into storage.buckets (id, name, public)
select 'place-banners', 'place-banners', true
where not exists (
  select 1 from storage.buckets where id = 'place-banners'
);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read access for place-banners'
  ) then
    create policy "Public read access for place-banners"
    on storage.objects
    for select
    using (bucket_id = 'place-banners');
  end if;
end $$;

-- Allow authenticated users to upload or replace their banner images
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated upload for place-banners'
  ) then
    create policy "Authenticated upload for place-banners"
    on storage.objects
    for insert
    with check (
      bucket_id = 'place-banners'
      and auth.uid() is not null
    );
  end if;
end $$;

-- Allow the original uploader (owner) to replace existing images
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Owner update access for place-banners'
  ) then
    create policy "Owner update access for place-banners"
    on storage.objects
    for update
    using (
      bucket_id = 'place-banners'
      and auth.uid() = owner
    )
    with check (
      bucket_id = 'place-banners'
      and auth.uid() = owner
    );
  end if;
end $$;

-- Allow the original uploader to delete their banner assets
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Owner delete access for place-banners'
  ) then
    create policy "Owner delete access for place-banners"
    on storage.objects
    for delete
    using (
      bucket_id = 'place-banners'
      and auth.uid() = owner
    );
  end if;
end $$;
