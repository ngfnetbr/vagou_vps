drop policy if exists "Users can read complaints" on public.school_complaints;
drop policy if exists "Admins and school team can manage complaints" on public.school_complaints;
drop policy if exists "Authenticated can insert complaints" on public.school_complaints;
drop policy if exists "Admins and professionals can update complaints" on public.school_complaints;
drop policy if exists "Admins and professionals can delete complaints" on public.school_complaints;

create policy "Admins and professionals can read complaints"
on public.school_complaints
for select
to authenticated
using (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'superadmin'::app_role)
    or has_role(auth.uid(), 'gestor'::app_role)
    or has_role(auth.uid(), 'professional'::text)
  )
);

create policy "School portal can read complaints of own school"
on public.school_complaints
for select
to authenticated
using (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and has_role(auth.uid(), 'school_coord'::app_role)
  and school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
);

create policy "Reporter can read own complaints"
on public.school_complaints
for select
to authenticated
using (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and reporter_id = auth.uid()
);

create policy "Admins and professionals can update complaints"
on public.school_complaints
for update
to authenticated
using (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'superadmin'::app_role)
    or has_role(auth.uid(), 'gestor'::app_role)
    or has_role(auth.uid(), 'professional'::text)
  )
)
with check (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'superadmin'::app_role)
    or has_role(auth.uid(), 'gestor'::app_role)
    or has_role(auth.uid(), 'professional'::text)
  )
);

create policy "Reporter can update own complaints"
on public.school_complaints
for update
to authenticated
using (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and reporter_id = auth.uid()
)
with check (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and reporter_id = auth.uid()
);

create policy "School portal can insert complaints to own school"
on public.school_complaints
for insert
to authenticated
with check (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and has_role(auth.uid(), 'school_coord'::app_role)
  and reporter_id = auth.uid()
  and school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
);

create policy "Admins and professionals can insert complaints"
on public.school_complaints
for insert
to authenticated
with check (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'superadmin'::app_role)
    or has_role(auth.uid(), 'gestor'::app_role)
    or has_role(auth.uid(), 'professional'::text)
  )
);

create policy "Admins and professionals can delete complaints"
on public.school_complaints
for delete
to authenticated
using (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'superadmin'::app_role)
    or has_role(auth.uid(), 'gestor'::app_role)
    or has_role(auth.uid(), 'professional'::text)
  )
);

