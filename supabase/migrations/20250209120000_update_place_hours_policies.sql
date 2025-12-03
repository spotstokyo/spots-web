drop policy if exists "Place hours select policy" on public.place_hours;
drop policy if exists "Place hours insert policy" on public.place_hours;
drop policy if exists "Place hours update policy" on public.place_hours;
drop policy if exists "Place hours delete policy" on public.place_hours;

create policy "Place hours select policy"
  on public.place_hours
  for select
  to anon, authenticated
  using (true);

create policy "Place hours insert policy"
  on public.place_hours
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and coalesce(profiles.is_admin, false) = true
    )
  );

create policy "Place hours update policy"
  on public.place_hours
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and coalesce(profiles.is_admin, false) = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and coalesce(profiles.is_admin, false) = true
    )
  );

create policy "Place hours delete policy"
  on public.place_hours
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and coalesce(profiles.is_admin, false) = true
    )
  );
