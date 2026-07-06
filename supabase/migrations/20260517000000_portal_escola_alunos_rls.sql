create policy "School coord can view children of own school"
on public.criancas
for select
to authenticated
using (
  has_permission(auth.uid(), 'modulos.sam.acessar'::text)
  and has_role(auth.uid(), 'school_coord'::app_role)
  and cmei_atual_id = (
    select
      case
        when p.cmei_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p.cmei_id::uuid
        else null
      end
    from public.profiles p
    where p.id = auth.uid()
  )
);

