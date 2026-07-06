create table if not exists appointment_specialty_notes (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id) on delete cascade not null,
  specialty_id uuid references specialties(id),
  anamnese text,
  avaliacao_especifica text,
  observacoes_comportamentais text,
  historico_escolar text,
  desenvolvimento_neuropsicomotor text,
  aspectos_comunicativos text,
  aspectos_emocionais text,
  aspectos_sociais text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table appointment_specialty_notes enable row level security;

create policy "Notes viewable by authenticated users"
  on appointment_specialty_notes for select
  to authenticated
  using ( true );

create policy "Professionals can insert notes"
  on appointment_specialty_notes for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'professional')
    )
  );

create policy "Professionals can update notes"
  on appointment_specialty_notes for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'professional')
    )
  );

