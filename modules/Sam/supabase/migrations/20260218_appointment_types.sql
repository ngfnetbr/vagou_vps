-- Appointment Types table
create table if not exists appointment_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table appointment_types enable row level security;

-- Policies (basic)
create policy "Appointment types viewable by authenticated users"
  on appointment_types for select
  to authenticated
  using ( true );

create policy "Admins can insert appointment types"
  on appointment_types for insert
  to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can update appointment types"
  on appointment_types for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can delete appointment types"
  on appointment_types for delete
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

