-- Allow admins to delete places
create policy "Enable delete for admins"
on "public"."places"
as permissive
for delete
to authenticated
using (
  (select is_admin from profiles where id = auth.uid()) = true
);
