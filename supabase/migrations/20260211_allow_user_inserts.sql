-- Allow authenticated users to insert into places
drop policy if exists "Enable insert for authenticated users only" on public.places;

create policy "Enable insert for authenticated users only"
on public.places
for insert
to authenticated
with check (true);

-- Allow authenticated users to update their own places (optional, or just allow all authenticated for now for simplicity if we don't track owner_id)
-- Assuming we want to allow at least insert.

-- Update place_hours policies to match
drop policy if exists "Place hours insert policy" on public.place_hours;
create policy "Place hours insert policy"
on public.place_hours
for insert
to authenticated
with check (true);

drop policy if exists "Place hours delete policy" on public.place_hours;
create policy "Place hours delete policy"
on public.place_hours
for delete
to authenticated
using (true);

-- Also allow update
drop policy if exists "Place hours update policy" on public.place_hours;
create policy "Place hours update policy"
on public.place_hours
for update
to authenticated
using (true)
with check (true);
